from fastapi import APIRouter, Depends, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import (
    clear_auth_cookies,
    json_from_result,
    redirect_from_result,
    set_auth_cookies,
)
from app.database.session import get_db
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/register")
async def register_user(
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    password_confirm: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    _ = name, phone
    service = AuthService(UserRepository(db))
    result = await service.register(email, password, password_confirm)
    return redirect_from_result(result)


@router.post("/login")
async def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(UserRepository(db))
    result = await service.login(email, password)
    if not result.ok:
        return json_from_result(result)

    response = RedirectResponse(url=result.data["redirect_url"], status_code=303)
    return set_auth_cookies(response, result.data["user_id"])


@router.get("/logout")
def logout():
    response = RedirectResponse(url="/", status_code=303)
    return clear_auth_cookies(response)
