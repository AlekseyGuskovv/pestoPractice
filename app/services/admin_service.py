from datetime import datetime
from decimal import Decimal

from app.core.utils import resolve_menu_image_url
from app.models.entities import MenuItem, RestaurantTable
from app.repositories.booking_repository import BookingRepository
from app.repositories.menu_repository import MenuRepository
from app.repositories.order_repository import AdminRepository
from app.schemas.common import ServiceResult


RESERVATION_ALLOWED_STATUSES = {"confirmed", "cancelled", "completed"}
ORDER_ALLOWED_STATUSES = {"new", "served", "cancelled"}


class AdminService:
    def __init__(
        self,
        admin_repo: AdminRepository,
        menu_repo: MenuRepository,
        booking_repo: BookingRepository,
    ):
        self.admin_repo = admin_repo
        self.menu_repo = menu_repo
        self.booking_repo = booking_repo

    async def get_dashboard(self) -> ServiceResult:
        res_rows = await self.admin_repo.list_all_reservations_with_details()
        reservations = [
            {
                "id": r.id,
                "date": r.reservation_date.isoformat(),
                "time_start": r.reservation_start_time.strftime("%H:%M"),
                "time_end": r.reservation_end_time.strftime("%H:%M"),
                "table_number": table_number,
                "guests": r.guests_count,
                "status": r.status,
                "user_email": user_email,
                "comment": r.comment,
            }
            for r, table_number, user_email in res_rows
        ]

        orders_models = await self.admin_repo.list_all_orders_with_items()
        users_map = await self.admin_repo.get_user_emails(
            {o.user_id for o in orders_models}
        )

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
                    "user_email": users_map.get(order.user_id, ""),
                    "items": items,
                }
            )

        return ServiceResult.success({"reservations": reservations, "orders": orders})

    async def change_reservation_status(
        self, reservation_id: int, new_status: str
    ) -> ServiceResult:
        new_status = (new_status or "").strip()
        if not new_status:
            return ServiceResult.failure("Статус обязателен.")
        if new_status not in RESERVATION_ALLOWED_STATUSES:
            return ServiceResult.failure(f"Нет такого статуса: {new_status}")

        reservation = await self.admin_repo.get_reservation(reservation_id)
        if not reservation:
            return ServiceResult.failure("Бронь не найдена.", status_code=404)

        reservation.status = new_status
        try:
            await self.admin_repo.commit()
        except Exception as exc:
            await self.admin_repo.rollback()
            return ServiceResult.failure(
                f"Ошибка изменения статуса: {exc}", status_code=500
            )

        return ServiceResult.success({"success": True})

    async def change_order_status(self, order_id: int, new_status: str) -> ServiceResult:
        new_status = (new_status or "").strip()
        if not new_status:
            return ServiceResult.failure("Статус обязателен.")
        if new_status not in ORDER_ALLOWED_STATUSES:
            return ServiceResult.failure(f"Недопустимый статус заказа: {new_status}")

        order = await self.admin_repo.get_order(order_id)
        if not order:
            return ServiceResult.failure("Заказ не найден.", status_code=404)

        order.status = new_status
        try:
            await self.admin_repo.commit()
        except Exception as exc:
            await self.admin_repo.rollback()
            return ServiceResult.failure(
                f"Ошибка изменения статуса: {exc}", status_code=500
            )

        return ServiceResult.success({"success": True})

    async def get_menu_admin(self) -> ServiceResult:
        categories_models = await self.menu_repo.list_categories_with_items()
        categories = []
        items = []
        for category in categories_models:
            categories.append(
                {"id": category.id, "name": category.name, "key": category.key}
            )
            for item in category.items:
                items.append(
                    {
                        "id": item.id,
                        "category_id": item.category_id,
                        "category_name": category.name,
                        "name": item.name,
                        "price": str(item.price),
                    }
                )
        return ServiceResult.success({"categories": categories, "items": items})

    async def add_menu_item(self, data: dict) -> ServiceResult:
        try:
            category_id = int(data.get("category_id"))
            name = (data.get("name") or "").strip()
            price = Decimal(str(data.get("price")))
        except Exception:
            return ServiceResult.failure("Некорректные данные блюда.")

        if not name:
            return ServiceResult.failure("Название блюда обязательно.")

        weight = data.get("weight")
        description = (data.get("description") or None) or None
        if weight is not None:
            try:
                weight = int(weight)
            except Exception:
                return ServiceResult.failure("Вес должен быть целым числом.")

        category = await self.menu_repo.get_category(category_id)
        if not category:
            return ServiceResult.failure("Категория не найдена.")

        item = MenuItem(
            category_id=category_id,
            name=name,
            description=description,
            weight=weight,
            price=price,
            image_url=resolve_menu_image_url(data.get("image_url") or ""),
        )

        try:
            created = await self.menu_repo.create_item(item)
        except Exception as exc:
            await self.menu_repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка сохранения блюда: {exc}", status_code=500
            )

        return ServiceResult.success({"success": True, "id": created.id}, status_code=201)

    async def delete_menu_item(self, item_id: int) -> ServiceResult:
        try:
            deleted = await self.menu_repo.delete_item(item_id)
        except Exception as exc:
            await self.menu_repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка удаления блюда: {exc}", status_code=500
            )

        if not deleted:
            return ServiceResult.failure("Блюдо не найдено.", status_code=404)
        return ServiceResult.success({"success": True})

    async def list_tables(self) -> ServiceResult:
        tables = await self.booking_repo.list_all_tables()
        return ServiceResult.success(
            {
                "tables": [
                    {
                        "id": t.id,
                        "table_number": t.table_number,
                        "cnt_seats": t.cnt_seats,
                        "is_active": bool(t.is_active),
                    }
                    for t in tables
                ]
            }
        )

    async def add_table(self, data: dict) -> ServiceResult:
        try:
            table_number = int(data.get("table_number"))
            cnt_seats = int(data.get("cnt_seats"))
            is_active = bool(data.get("is_active"))
        except Exception:
            return ServiceResult.failure("Некорректные данные по столику.")

        if table_number <= 0 or cnt_seats <= 0:
            return ServiceResult.failure("Номер и количество мест должны быть > 0.")

        table = RestaurantTable(
            table_number=table_number,
            cnt_seats=cnt_seats,
            is_active=is_active,
        )
        try:
            created = await self.booking_repo.create_table(table)
        except Exception as exc:
            await self.booking_repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка сохранения столика: {exc}", status_code=500
            )

        return ServiceResult.success({"success": True, "id": created.id}, status_code=201)

    async def delete_table(self, table_id: int) -> ServiceResult:
        try:
            deleted = await self.booking_repo.delete_table(table_id)
        except Exception as exc:
            await self.booking_repo.db.rollback()
            return ServiceResult.failure(
                f"Ошибка удаления столика: {exc}", status_code=500
            )

        if not deleted:
            return ServiceResult.failure("Столик не найден.", status_code=404)
        return ServiceResult.success({"success": True})
