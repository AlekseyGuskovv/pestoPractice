from datetime import date as date_type, time as time_type

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Reservation, RestaurantTable


class BookingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_suitable_tables(self, guests: int) -> list[RestaurantTable]:
        result = await self.db.execute(
            select(RestaurantTable).where(
                and_(
                    RestaurantTable.cnt_seats >= guests,
                    RestaurantTable.is_active == True,
                )
            )
        )
        return list(result.scalars().all())

    async def list_busy_reservations(
        self,
        res_date: date_type,
        res_start: time_type,
        res_end: time_type,
    ) -> list[Reservation]:
        result = await self.db.execute(
            select(Reservation).where(
                and_(
                    Reservation.reservation_date == res_date,
                    Reservation.status != "cancelled",
                    Reservation.reservation_end_time > res_start,
                    Reservation.reservation_start_time < res_end,
                )
            )
        )
        return list(result.scalars().all())

    async def get_table(self, table_id: int) -> RestaurantTable | None:
        return await self.db.get(RestaurantTable, table_id)

    async def has_conflicting_reservation(
        self,
        table_id: int,
        res_date: date_type,
        res_start: time_type,
        res_end: time_type,
    ) -> bool:
        result = await self.db.execute(
            select(Reservation).where(
                and_(
                    Reservation.table_id == table_id,
                    Reservation.reservation_date == res_date,
                    Reservation.status != "cancelled",
                    Reservation.reservation_end_time > res_start,
                    Reservation.reservation_start_time < res_end,
                )
            )
        )
        return result.first() is not None

    async def create_reservation(self, reservation: Reservation) -> Reservation:
        self.db.add(reservation)
        await self.db.commit()
        await self.db.refresh(reservation)
        return reservation

    async def list_user_reservations_with_table(
        self, user_id: int
    ) -> list[tuple[Reservation, int]]:
        result = await self.db.execute(
            select(Reservation, RestaurantTable.table_number)
            .join(RestaurantTable, Reservation.table_id == RestaurantTable.id)
            .where(Reservation.user_id == user_id)
            .order_by(
                Reservation.reservation_date.desc(),
                Reservation.reservation_start_time.desc(),
            )
        )
        return list(result.all())

    async def list_upcoming_user_reservations(self, user_id: int, today: date_type):
        result = await self.db.execute(
            select(Reservation)
            .where(
                and_(
                    Reservation.user_id == user_id,
                    Reservation.status == "confirmed",
                    Reservation.reservation_date >= today,
                )
            )
            .order_by(
                Reservation.reservation_date,
                Reservation.reservation_start_time,
            )
        )
        return list(result.scalars().all())

    async def get_user_reservation(
        self, reservation_id: int, user_id: int
    ) -> Reservation | None:
        result = await self.db.execute(
            select(Reservation).where(
                and_(
                    Reservation.id == reservation_id,
                    Reservation.user_id == user_id,
                    Reservation.status != "cancelled",
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_all_tables(self) -> list[RestaurantTable]:
        result = await self.db.execute(
            select(RestaurantTable).order_by(RestaurantTable.table_number)
        )
        return list(result.scalars().all())

    async def create_table(self, table: RestaurantTable) -> RestaurantTable:
        self.db.add(table)
        await self.db.commit()
        await self.db.refresh(table)
        return table

    async def delete_table(self, table_id: int) -> bool:
        table = await self.db.get(RestaurantTable, table_id)
        if not table:
            return False
        await self.db.delete(table)
        await self.db.commit()
        return True
