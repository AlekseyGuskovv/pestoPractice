from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.entities import User
from app.repositories.user_repository import UserRepository


async def get_current_user_id(request: Request) -> int:
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        raise HTTPException(status_code=401, detail="Необходимо войти в аккаунт.")
    try:
        return int(user_id_cookie)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Некорректный пользователь.") from exc


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = await get_current_user_id(request)
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Необходимо войти в аккаунт.")
    return user


async def get_current_manager(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await get_current_user(request, db)
    if getattr(user, "role", None) != "manager":
        raise HTTPException(status_code=403, detail="Недостаточно прав.")
    return user
