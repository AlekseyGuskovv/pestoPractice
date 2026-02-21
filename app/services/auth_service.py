import re
from decimal import Decimal

from app.core.security import hash_password, verify_password
from app.models.entities import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import ServiceResult


class AuthService:
    EMAIL_REGEX = r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"

    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def register(
        self,
        email: str,
        password: str,
        password_confirm: str,
    ) -> ServiceResult:
        if password != password_confirm:
            return ServiceResult.failure("Пароли не совпадают")
        if len(password) < 5:
            return ServiceResult.failure("Пароль должен быть не менее 5 символов.")
        if not re.match(self.EMAIL_REGEX, email):
            return ServiceResult.failure("Неверный формат email.")

        try:
            await self.repo.create(email=email, password_hash=hash_password(password))
        except Exception as exc:
            await self.repo.db.rollback()
            return ServiceResult.failure(str(exc))

        return ServiceResult.success({"redirect_url": "/login"})

    async def login(self, email: str, password: str) -> ServiceResult:
        user = await self.repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            return ServiceResult.failure("Неверный email или пароль.")

        redirect_url = "/admin" if getattr(user, "role", None) == "manager" else "/"
        return ServiceResult.success({"redirect_url": redirect_url, "user_id": user.id})

    @staticmethod
    def build_auth_cookies(user: User) -> dict:
        return {"user_id": str(user.id)}
