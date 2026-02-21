from fastapi import APIRouter, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import json_from_result, redirect_from_result, set_auth_cookies
from app.core.config import settings
from app.database.session import get_db
from app.repositories.menu_repository import MenuRepository
from app.services.menu_service import MenuService

router = APIRouter(tags=["menu"])


@router.get("/api/menu")
async def api_menu(db: AsyncSession = Depends(get_db)):
    service = MenuService(MenuRepository(db))
    result = await service.get_public_menu()
    return json_from_result(result)
