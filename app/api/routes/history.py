from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import json_from_result
from app.core.deps import get_current_user_id
from app.database.session import get_db
from app.repositories.booking_repository import BookingRepository
from app.repositories.order_repository import OrderRepository
from app.services.booking_service import HistoryService

router = APIRouter(tags=["history"])


@router.get("/api/history")
async def api_history(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = await get_current_user_id(request)
    service = HistoryService(BookingRepository(db), OrderRepository(db))
    result = await service.get_user_history(user_id)
    return json_from_result(result)
