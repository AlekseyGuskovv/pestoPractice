from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.entities import Order, OrderItem, Reservation, RestaurantTable, User


class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_user_orders_with_items(self, user_id: int) -> list[Order]:
        result = await self.db.execute(
            select(Order)
            .options(joinedload(Order.items).joinedload(OrderItem.menu_item))
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
        )
        return list(result.scalars().unique().all())

    async def create_order_with_items(
        self,
        order: Order,
        order_items: list[OrderItem],
    ) -> Order:
        self.db.add(order)
        await self.db.flush()
        for item in order_items:
            item.order_id = order.id
            self.db.add(item)
        await self.db.commit()
        await self.db.refresh(order)
        return order


class AdminRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all_reservations_with_details(self):
        result = await self.db.execute(
            select(Reservation, RestaurantTable.table_number, User.email)
            .join(RestaurantTable, Reservation.table_id == RestaurantTable.id)
            .join(User, Reservation.user_id == User.id)
            .order_by(
                Reservation.reservation_date.desc(),
                Reservation.reservation_start_time.desc(),
            )
        )
        return list(result.all())

    async def list_all_orders_with_items(self) -> list[Order]:
        result = await self.db.execute(
            select(Order)
            .options(joinedload(Order.items).joinedload(OrderItem.menu_item))
            .order_by(Order.created_at.desc())
        )
        return list(result.scalars().unique().all())

    async def get_user_emails(self, user_ids: set[int]) -> dict[int, str]:
        if not user_ids:
            return {}
        result = await self.db.execute(
            select(User.id, User.email).where(User.id.in_(user_ids))
        )
        return {uid: email for uid, email in result.all()}

    async def get_reservation(self, reservation_id: int) -> Reservation | None:
        return await self.db.get(Reservation, reservation_id)

    async def get_order(self, order_id: int) -> Order | None:
        return await self.db.get(Order, order_id)

    async def commit(self) -> None:
        await self.db.commit()

    async def rollback(self) -> None:
        await self.db.rollback()
