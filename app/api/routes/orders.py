from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import json_from_result
from app.database.session import get_db
from app.repositories.booking_repository import BookingRepository
from app.repositories.menu_repository import MenuRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.common import ServiceResult
from app.services.booking_service import OrderService

router = APIRouter(tags=["orders"])


@router.post("/orders/create")
async def create_order(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        return json_from_result(
            ServiceResult.failure(
                "Необходимо войти в аккаунт для оформления заказа.",
                status_code=401,
            )
        )
    user_id = int(user_id_cookie)

    try:
        payload = await request.json()
    except Exception:
        return json_from_result(
            ServiceResult.failure(
                "Некорректный формат данных (ожидается JSON).",
                status_code=400,
            )
        )

    service = OrderService(
        OrderRepository(db),
        MenuRepository(db),
        BookingRepository(db),
    )
    result = await service.create_order(
        user_id=user_id,
        items=payload.get("items") or [],
        reservation_id=payload.get("reservation_id"),
    )
    return json_from_result(result)
