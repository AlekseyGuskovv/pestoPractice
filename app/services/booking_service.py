from datetime import date as date_type, datetime

from decimal import Decimal

from app.core.utils import parse_date, parse_time
from app.models.entities import Order, OrderItem, Reservation
from app.repositories.booking_repository import BookingRepository
from app.repositories.menu_repository import MenuRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.common import ServiceResult


class BookingService:
    def __init__(self, repo: BookingRepository):
        self.repo = repo

    async def check_tables(
        self,
        date: str,
        time_start: str,
        time_end: str,
        guests: int,
        comment: str,
    ) -> ServiceResult:
        try:
            res_date = parse_date(date)
            res_start = parse_time(time_start)
            res_end = parse_time(time_end)
        except Exception:
            return ServiceResult.failure("Неверный формат даты или времени.")

        if res_date < date_type.today():
            return ServiceResult.failure("Нельзя забронировать столик на прошедшую дату.")

        if res_end <= res_start:
            return ServiceResult.failure(
                "Время окончания должно быть позже времени начала."
            )

        all_tables = await self.repo.list_suitable_tables(guests)
        if not all_tables:
            return ServiceResult.failure(
                "Нет столиков, рассчитанных на такое количество гостей.",
                status_code=200,
            )

        busy_reservations = await self.repo.list_busy_reservations(
            res_date, res_start, res_end
        )
        busy_table_ids = {r.table_id for r in busy_reservations}
        free_tables = [t for t in all_tables if t.id not in busy_table_ids]

        if not free_tables:
            return ServiceResult.failure(
                "К сожалению, на выбранные дату и время свободных столиков нет.",
                status_code=200,
            )

        return ServiceResult.success(
            {
                "free_tables": [
                    {
                        "id": t.id,
                        "table_number": t.table_number,
                        "seats": t.cnt_seats,
                    }
                    for t in free_tables
                ],
                "data": {
                    "date": date,
                    "time_start": time_start,
                    "time_end": time_end,
                    "guests": guests,
                    "comment": comment,
                },
            }
        )

    async def confirm_booking(
        self,
        user_id: int,
        date: str,
        time_start: str,
        time_end: str,
        guests: int,
        comment: str,
        table_id: int,
    ) -> ServiceResult:
        try:
            res_date = parse_date(date)
            res_start = parse_time(time_start)
            res_end = parse_time(time_end)
        except Exception:
            return ServiceResult.failure("Неверный формат даты или времени.")

        if res_date < date_type.today():
            return ServiceResult.failure("Нельзя создать бронь на прошедшую дату.")

        if res_end <= res_start:
            return ServiceResult.failure(
                "Время окончания должно быть позже времени начала."
            )

        table = await self.repo.get_table(table_id)
        if not table:
            return ServiceResult.failure("Столик не найден.")

        if guests > table.cnt_seats:
            return ServiceResult.failure(
                f"Столик вмещает только {table.cnt_seats} гостей."
            )

        if await self.repo.has_conflicting_reservation(
            table_id, res_date, res_start, res_end
        ):
            return ServiceResult.failure("Столик уже забронирован на это время.")

        reservation = Reservation(
            user_id=user_id,
            table_id=table_id,
            reservation_date=res_date,
            reservation_start_time=res_start,
            reservation_end_time=res_end,
            guests_count=guests,
            status="confirmed",
            comment=comment or None,
        )

        try:
            await self.repo.create_reservation(reservation)
        except Exception as exc:
            await self.repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка при сохранении брони: {exc}", status_code=500
            )

        return ServiceResult.success(
            {"success": True, "message": "Бронирование успешно создано!"}
        )

    async def list_upcoming_reservations(self, user_id: int) -> ServiceResult:
        reservations = await self.repo.list_upcoming_user_reservations(
            user_id, date_type.today()
        )
        return ServiceResult.success(
            {
                "success": True,
                "reservations": [
                    {
                        "id": r.id,
                        "date": r.reservation_date.isoformat(),
                        "time_start": r.reservation_start_time.strftime("%H:%M"),
                        "time_end": r.reservation_end_time.strftime("%H:%M"),
                        "table_id": r.table_id,
                        "guests": r.guests_count,
                    }
                    for r in reservations
                ],
            }
        )


class HistoryService:
    def __init__(self, booking_repo: BookingRepository, order_repo: OrderRepository):
        self.booking_repo = booking_repo
        self.order_repo = order_repo

    async def get_user_history(self, user_id: int) -> ServiceResult:
        res_rows = await self.booking_repo.list_user_reservations_with_table(user_id)
        reservations = [
            {
                "id": r.id,
                "date": r.reservation_date.isoformat(),
                "time_start": r.reservation_start_time.strftime("%H:%M"),
                "time_end": r.reservation_end_time.strftime("%H:%M"),
                "table_number": table_number,
                "guests": r.guests_count,
                "status": r.status,
            }
            for r, table_number in res_rows
        ]

        orders_models = await self.order_repo.list_user_orders_with_items(user_id)
        orders = []
        for order in orders_models:
            items = []
            for oi in order.items:
                price = Decimal(str(oi.price))
                cnt = oi.cnt
                items.append(
                    {
                        "name": oi.menu_item.name if oi.menu_item else "",
                        "cnt": cnt,
                        "price": str(price),
                        "total": str(price * cnt),
                    }
                )
            orders.append(
                {
                    "id": order.id,
                    "created_at": (
                        order.created_at.isoformat(sep=" ", timespec="minutes")
                        if isinstance(order.created_at, datetime)
                        else str(order.created_at)
                    ),
                    "status": order.status,
                    "total_amount": str(order.total_amount),
                    "reservation_id": order.reservation_id,
                    "items": items,
                }
            )

        return ServiceResult.success({"reservations": reservations, "orders": orders})


class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        menu_repo: MenuRepository,
        booking_repo: BookingRepository,
    ):
        self.order_repo = order_repo
        self.menu_repo = menu_repo
        self.booking_repo = booking_repo

    async def create_order(
        self,
        user_id: int,
        items: list[dict],
        reservation_id,
    ) -> ServiceResult:
        if not items:
            return ServiceResult.failure("Список блюд пуст.")

        reservation_obj = None
        if reservation_id is not None:
            try:
                reservation_id_int = int(reservation_id)
            except Exception:
                return ServiceResult.failure("Некорректный идентификатор брони.")

            reservation_obj = await self.booking_repo.get_user_reservation(
                reservation_id_int, user_id
            )
            if not reservation_obj:
                return ServiceResult.failure(
                    "Выбранная бронь не найдена или не принадлежит вам."
                )

        try:
            menu_item_ids = [int(it["menu_item_id"]) for it in items]
        except Exception:
            return ServiceResult.failure("Некорректные данные по блюдам.")

        db_items = await self.menu_repo.get_items_by_ids(menu_item_ids)
        db_items_map = {m.id: m for m in db_items}

        if len(db_items_map) != len(set(menu_item_ids)):
            return ServiceResult.failure("Некоторые блюда не найдены в меню.")

        total_amount = Decimal("0.00")
        order_items_models = []

        for it in items:
            mid = int(it["menu_item_id"])
            try:
                cnt = int(it.get("cnt", 1))
            except Exception:
                return ServiceResult.failure("Количество должно быть целым числом.")
            if cnt <= 0:
                return ServiceResult.failure("Количество должно быть больше 0.")

            menu_item = db_items_map[mid]
            price = Decimal(str(menu_item.price))
            total_amount += price * cnt
            order_items_models.append(
                OrderItem(menu_item_id=mid, cnt=cnt, price=price)
            )

        new_order = Order(
            user_id=user_id,
            reservation_id=reservation_obj.id if reservation_obj else None,
            status="new",
            total_amount=total_amount,
        )

        try:
            await self.order_repo.create_order_with_items(new_order, order_items_models)
        except Exception as exc:
            await self.order_repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка при создании заказа: {exc}", status_code=500
            )

        return ServiceResult.success(
            {
                "success": True,
                "order_id": new_order.id,
                "message": "Заказ успешно создан!",
                "total_amount": str(total_amount),
                "reservation_id": reservation_obj.id if reservation_obj else None,
            }
        )
