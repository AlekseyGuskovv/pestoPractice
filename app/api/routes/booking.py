from fastapi import APIRouter, Depends, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import json_from_result
from app.core.deps import get_current_user_id
from app.database.session import get_db
from app.repositories.booking_repository import BookingRepository
from app.services.booking_service import BookingService

router = APIRouter(tags=["booking"])


@router.post("/booking/check")
async def check_tables(
    date: str = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    guests: int = Form(...),
    comment: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    service = BookingService(BookingRepository(db))
    result = await service.check_tables(date, time_start, time_end, guests, comment)
    return json_from_result(result)


@router.post("/booking/confirm")
async def confirm_booking(
    request: Request,
    date: str = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    guests: int = Form(...),
    comment: str = Form(default=""),
    table_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    user_id = await get_current_user_id(request)
    service = BookingService(BookingRepository(db))
    result = await service.confirm_booking(
        user_id, date, time_start, time_end, guests, comment, table_id
    )
    return json_from_result(result)


@router.get("/api/my_reservations")
async def my_reservations(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = await get_current_user_id(request)
    service = BookingService(BookingRepository(db))
    result = await service.list_upcoming_reservations(user_id)
    return json_from_result(result)
