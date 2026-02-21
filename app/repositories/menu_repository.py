from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.entities import MenuCategory, MenuItem


class MenuRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_categories(self) -> list[MenuCategory]:
        result = await self.db.execute(select(MenuCategory).order_by(MenuCategory.id))
        return list(result.scalars().all())

    async def list_items_with_category(self) -> list[MenuItem]:
        result = await self.db.execute(
            select(MenuItem).options(joinedload(MenuItem.category)).order_by(MenuItem.id)
        )
        return list(result.scalars().all())

    async def list_categories_with_items(self) -> list[MenuCategory]:
        result = await self.db.execute(
            select(MenuCategory)
            .options(joinedload(MenuCategory.items))
            .order_by(MenuCategory.id)
        )
        return list(result.scalars().unique().all())

    async def get_category(self, category_id: int) -> MenuCategory | None:
        return await self.db.get(MenuCategory, category_id)

    async def create_item(self, item: MenuItem) -> MenuItem:
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item_id: int) -> bool:
        item = await self.db.get(MenuItem, item_id)
        if not item:
            return False
        await self.db.delete(item)
        await self.db.commit()
        return True

    async def get_items_by_ids(self, item_ids: list[int]) -> list[MenuItem]:
        result = await self.db.execute(select(MenuItem).where(MenuItem.id.in_(item_ids)))
        return list(result.scalars().all())
