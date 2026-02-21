from app.core.utils import normalize_image_url
from app.repositories.menu_repository import MenuRepository
from app.schemas.common import ServiceResult


class MenuService:
    MENU_LOAD_ERROR = (
        "Не удалось загрузить меню. "
        "Убедитесь, что PostgreSQL запущен и backend доступен "
        "(uvicorn main:app --reload)."
    )

    def __init__(self, repo: MenuRepository):
        self.repo = repo

    async def get_public_menu(self) -> ServiceResult:
        try:
            categories = await self.repo.list_categories()
            items = await self.repo.list_items_with_category()
            return ServiceResult.success(
                {
                    "categories": [
                        {"id": c.id, "name": c.name, "key": c.key} for c in categories
                    ],
                    "items": [self._serialize_item(item) for item in items],
                }
            )
        except Exception:
            return ServiceResult.failure(self.MENU_LOAD_ERROR, status_code=503)

    def _serialize_item(self, item) -> dict:
        return {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "weight": item.weight,
            "price": str(item.price) if item.price is not None else None,
            "image_url": normalize_image_url(item.image_url),
            "category": (
                {
                    "id": item.category.id,
                    "name": item.category.name,
                    "key": item.category.key,
                }
                if item.category
                else None
            ),
        }
