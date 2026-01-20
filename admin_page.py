from datetime import datetime
from decimal import Decimal
from pathlib import Path

from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from database import get_db
from models import (
    User,
    RestaurantTable,
    Reservation,
    MenuCategory,
    MenuItem,
    Order,
    OrderItem,
)

router = APIRouter(prefix="/admin", tags=["admin"])

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

RESERVATION_ALLOWED_STATUSES = {"confirmed", "cancelled", "completed"}
ORDER_ALLOWED_STATUSES = {"new", "served", "cancelled"}


async def get_current_manager(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        raise HTTPException(status_code=401, detail="Необходимо войти в аккаунт.")

    try:
        user_id = int(user_id_cookie)
    except ValueError:
        raise HTTPException(status_code=401, detail="Некорректный пользователь.")

    user = await db.get(User, user_id)
    if not user or getattr(user, "role", None) != "manager":
        raise HTTPException(status_code=403, detail="Недостаточно прав.")

    return user

@router.get("/", response_class=FileResponse)
async def admin_page(
    request: Request,
    manager: User = Depends(get_current_manager),
):
    index_path = FRONTEND_DIST / "index.html"
    if not index_path.exists():
        raise HTTPException(
            status_code=503,
            detail="Frontend not built. Run npm run build in frontend/",
        )
    return FileResponse(index_path)


@router.get("/api/dashboard")
async def admin_dashboard(
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    res_query = (
        select(
            Reservation,
            RestaurantTable.table_number,
            User.email,
        )
        .join(RestaurantTable, Reservation.table_id == RestaurantTable.id)
        .join(User, Reservation.user_id == User.id)
        .order_by(
            Reservation.reservation_date.desc(),
            Reservation.reservation_start_time.desc(),
        )
    )
    res_result = await db.execute(res_query)
    res_rows = res_result.all()

    reservations = []
    for r, table_number, user_email in res_rows:
        reservations.append(
            {
                "id": r.id,
                "date": r.reservation_date.isoformat(),
                "time_start": r.reservation_start_time.strftime("%H:%M"),
                "time_end": r.reservation_end_time.strftime("%H:%M"),
                "table_number": table_number,
                "guests": r.guests_count,
                "status": r.status,
                "user_email": user_email,
                "comment": r.comment,
            }
        )
    orders_query = (
        select(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.menu_item)
        )
        .order_by(Order.created_at.desc())
    )
    orders_result = await db.execute(orders_query)
    orders_models = orders_result.scalars().unique().all()

    user_ids = {o.user_id for o in orders_models}
    if user_ids:
        users_result = await db.execute(
            select(User.id, User.email).where(User.id.in_(user_ids))
        )
        users_map = {uid: email for uid, email in users_result.all()}
    else:
        users_map = {}

    orders = []
    for o in orders_models:
        items = []
        for oi in o.items:
            name = oi.menu_item.name if oi.menu_item else ""
            price = Decimal(str(oi.price))
            cnt = oi.cnt
            items.append(
                {
                    "name": name,
                    "cnt": cnt,
                    "price": str(price),
                    "total": str(price * cnt),
                }
            )
        orders.append(
            {
                "id": o.id,
                "created_at": (
                    o.created_at.isoformat(sep=" ", timespec="minutes")
                    if isinstance(o.created_at, datetime)
                    else str(o.created_at)
                ),
                "status": o.status,
                "total_amount": str(o.total_amount),
                "reservation_id": o.reservation_id,
                "user_email": users_map.get(o.user_id, ""),
                "items": items,
            }
        )

    return JSONResponse(
        {
            "reservations": reservations,
            "orders": orders,
        }
    )

@router.patch("/api/reservations/{reservation_id}/status")
async def admin_change_reservation_status(
    reservation_id: int,
    request: Request,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    new_status = (data.get("status") or "").strip()
    if not new_status:
        raise HTTPException(status_code=400, detail="Статус обязателен.")

    if new_status not in RESERVATION_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Нет такого статуса: {new_status}",
        )

    reservation = await db.get(Reservation, reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Бронь не найдена.")

    reservation.status = new_status

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка изменения статуса: {e}")

    return JSONResponse({"success": True})

@router.patch("/api/orders/{order_id}/status")
async def admin_change_order_status(
    order_id: int,
    request: Request,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    new_status = (data.get("status") or "").strip()
    if not new_status:
        raise HTTPException(status_code=400, detail="Статус обязателен.")

    if new_status not in ORDER_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый статус заказа: {new_status}",
        )

    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден.")

    order.status = new_status

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка изменения статуса: {e}")

    return JSONResponse({"success": True})

@router.get("/api/menu")
async def admin_menu(
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    cat_result = await db.execute(
        select(MenuCategory)
        .options(joinedload(MenuCategory.items))
        .order_by(MenuCategory.id)
    )
    categories_models = cat_result.scalars().unique().all()

    categories = []
    items = []

    for c in categories_models:
        categories.append(
            {
                "id": c.id,
                "name": c.name,
                "key": c.key,
            }
        )
        for it in c.items:
            items.append(
                {
                    "id": it.id,
                    "category_id": it.category_id,
                    "category_name": c.name,
                    "name": it.name,
                    "price": str(it.price),
                }
            )

    return JSONResponse(
        {
            "categories": categories,
            "items": items,
        }
    )


@router.post("/api/menu/items")
async def admin_add_menu_item(
    request: Request,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    try:
        category_id = int(data.get("category_id"))
        name = (data.get("name") or "").strip()
        price = Decimal(str(data.get("price")))
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректные данные блюда.")

    if not name:
        raise HTTPException(status_code=400, detail="Название блюда обязательно.")

    weight = data.get("weight")
    description = (data.get("description") or None) or None

    if weight is not None:
        try:
            weight = int(weight)
        except Exception:
            raise HTTPException(status_code=400, detail="Вес должен быть целым числом.")

    raw_image = (data.get("image_url") or "").strip()
    if raw_image == "":
        image_url = None
    else:
        if "://" in raw_image or raw_image.startswith("/static/"):
            image_url = raw_image
        else:
            image_url = "/static/image/" + raw_image.lstrip("/").split("/")[-1]

    cat = await db.get(MenuCategory, category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Категория не найдена.")

    new_item = MenuItem(
        category_id=category_id,
        name=name,
        description=description,
        weight=weight,
        price=price,
        image_url=image_url,
    )

    db.add(new_item)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения блюда: {e}")

    return JSONResponse(
        {"success": True, "id": new_item.id},
        status_code=201,
    )


@router.delete("/api/menu/items/{item_id}")
async def admin_delete_menu_item(
    item_id: int,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = delete(MenuItem).where(MenuItem.id == item_id)
    try:
        result = await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления блюда: {e}")

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Блюдо не найдено.")

    return JSONResponse({"success": True})


@router.get("/api/tables")
async def admin_get_tables(
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(RestaurantTable).order_by(RestaurantTable.table_number)
    )
    tables_models = res.scalars().all()

    tables = [
        {
            "id": t.id,
            "table_number": t.table_number,
            "cnt_seats": t.cnt_seats,
            "is_active": bool(t.is_active),
        }
        for t in tables_models
    ]

    return JSONResponse({"tables": tables})


@router.post("/api/tables")
async def admin_add_table(
    request: Request,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    try:
        table_number = int(data.get("table_number"))
        cnt_seats = int(data.get("cnt_seats"))
        is_active = bool(data.get("is_active"))
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректные данные по столику.")

    if table_number <= 0 or cnt_seats <= 0:
        raise HTTPException(status_code=400, detail="Номер и количество мест должны быть > 0.")

    new_table = RestaurantTable(
        table_number=table_number,
        cnt_seats=cnt_seats,
        is_active=is_active,
    )

    db.add(new_table)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения столика: {e}")

    return JSONResponse(
        {"success": True, "id": new_table.id},
        status_code=201,
    )

@router.delete("/api/tables/{table_id}")
async def admin_delete_table(
    table_id: int,
    manager: User = Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    stmt = delete(RestaurantTable).where(RestaurantTable.id == table_id)
    try:
        result = await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления столика: {e}")

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Столик не найден.")

    return JSONResponse({"success": True})
