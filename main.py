import re
from datetime import date as date_type, time as time_type, datetime
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

from admin_page import router as admin_router
from fastapi import FastAPI, Form, Depends, Request
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import insert, select, and_
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
from security import hash_password, verify_password


app = FastAPI(title="Pesto")
app.include_router(admin_router)

BASE_DIR = Path(__file__).resolve().parent

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=str(BASE_DIR))


@app.get("/", response_class=FileResponse)
def root():
    return FileResponse(BASE_DIR / "pesto_main.html")


@app.get("/menu", response_class=HTMLResponse)
async def menu_page(request: Request, db: AsyncSession = Depends(get_db)):
    categories_result = await db.execute(select(MenuCategory).order_by(MenuCategory.id))
    categories = categories_result.scalars().all()

    items_result = await db.execute(
        select(MenuItem).options(joinedload(MenuItem.category)).order_by(MenuItem.id)
    )
    items = items_result.scalars().all()

    return templates.TemplateResponse(
        "pesto_menu.html",
        {
            "request": request,
            "categories": categories,
            "items": items,
        },
    )


@app.get("/booking", response_class=FileResponse)
def booking_page():
    return FileResponse(BASE_DIR / "pesto_booking.html")


@app.get("/login", response_class=FileResponse)
def login_page():
    return FileResponse(BASE_DIR / "login.html")


@app.get("/register", response_class=FileResponse)
def register_page():
    return FileResponse(BASE_DIR / "register.html")


@app.get("/history", response_class=HTMLResponse)
async def history_page(request: Request, db: AsyncSession = Depends(get_db)):
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        return RedirectResponse(url="/login", status_code=303)

    user_id = int(user_id_cookie)

    res_query = (
        select(Reservation, RestaurantTable.table_number)
        .join(RestaurantTable, Reservation.table_id == RestaurantTable.id)
        .where(Reservation.user_id == user_id)
        .order_by(
            Reservation.reservation_date.desc(),
            Reservation.reservation_start_time.desc(),
        )
    )
    res_result = await db.execute(res_query)
    res_rows = res_result.all()

    reservations = []
    for r, table_number in res_rows:
        reservations.append(
            {
                "id": r.id,
                "date": r.reservation_date,
                "time_start": r.reservation_start_time,
                "time_end": r.reservation_end_time,
                "table_number": table_number,
                "guests": r.guests_count,
                "status": r.status,
            }
        )

    orders_query = (
        select(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.menu_item))
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
    )

    orders_result = await db.execute(orders_query)
    orders_models = orders_result.scalars().unique().all()

    orders = []
    for o in orders_models:
        items = []
        for oi in o.items:
            items.append(
                SimpleNamespace(
                    name=oi.menu_item.name if oi.menu_item else "",
                    cnt=oi.cnt,
                    price=oi.price,
                    total=oi.price * oi.cnt,
                )
            )

        orders.append(
            SimpleNamespace(
                id=o.id,
                created_at=o.created_at,
                status=o.status,
                total_amount=o.total_amount,
                reservation_id=o.reservation_id,
                items=items,
            )
        )

    return templates.TemplateResponse(
        "pesto_history.html",
        {
            "request": request,
            "reservations": reservations,
            "orders": orders,
        },
    )


@app.post("/register")
async def register_user(
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    password_confirm: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    if password != password_confirm:
        return JSONResponse({"error": "Пароли не совпадают"}, status_code=400)

    if len(password) < 5:
        return JSONResponse(
            {"error": "Пароль должен быть не менее 5 символов."},
            status_code=400,
        )

    email_regex = r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
    if not re.match(email_regex, email):
        return JSONResponse({"error": "Неверный формат email."}, status_code=400)

    password_hashed = hash_password(password)

    stmt = insert(User).values(
        email=email,
        password_hash=password_hashed,
    )

    try:
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        return JSONResponse({"error": str(e)}, status_code=400)

    return RedirectResponse(url="/login", status_code=303)


@app.post("/login")
async def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        return JSONResponse(
            {"error": "Неверный email или пароль."},
            status_code=400,
        )

    redirect_url = "/"
    if getattr(user, "role", None) == "manager":
        redirect_url = "/admin"

    response = RedirectResponse(url=redirect_url, status_code=303)
    response.set_cookie("logged_in", "1", path="/", max_age=3600 * 24 * 7)
    response.set_cookie("user_id", str(user.id), path="/", max_age=3600 * 24 * 7)
    return response


@app.get("/logout")
def logout():
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie("logged_in", path="/")
    response.delete_cookie("user_id", path="/")
    return response


def parse_date(d: str) -> date_type:
    return date_type.fromisoformat(d)


def parse_time(t: str) -> time_type:
    return datetime.strptime(t, "%H:%M").time()


@app.post("/booking/check")
async def check_tables(
    request: Request,
    date: str = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    guests: int = Form(...),
    comment: str = Form(default=""),
    db: AsyncSession = Depends(get_db),
):
    try:
        res_date = parse_date(date)
        res_start = parse_time(time_start)
        res_end = parse_time(time_end)
    except Exception:
        return JSONResponse(
            {"error": "Неверный формат даты или времени."},
            status_code=400,
        )

    if res_date < date_type.today():
        return JSONResponse(
            {"error": "Нельзя забронировать столик на прошедшую дату."},
            status_code=400,
        )

    if res_end <= res_start:
        return JSONResponse(
            {"error": "Время окончания должно быть позже времени начала."},
            status_code=400,
        )

    tables_query = select(RestaurantTable).where(
        and_(
            RestaurantTable.cnt_seats >= guests,
            RestaurantTable.is_active == True,
        )
    )
    tables_result = await db.execute(tables_query)
    all_tables = tables_result.scalars().all()

    if not all_tables:
        return JSONResponse(
            {"error": "Нет столиков, рассчитанных на такое количество гостей."},
            status_code=200,
        )

    reservations_query = select(Reservation).where(
        and_(
            Reservation.reservation_date == res_date,
            Reservation.status != "cancelled",
            Reservation.reservation_end_time > res_start,
            Reservation.reservation_start_time < res_end,
        )
    )
    res_result = await db.execute(reservations_query)
    busy_reservations = res_result.scalars().all()
    busy_table_ids = {r.table_id for r in busy_reservations}

    free_tables = [t for t in all_tables if t.id not in busy_table_ids]

    if not free_tables:
        return JSONResponse(
            {"error": "К сожалению, на выбранные дату и время свободных столиков нет."},
            status_code=200,
        )

    free_tables_data = [
        {
            "id": t.id,
            "table_number": t.table_number,
            "seats": t.cnt_seats,
        }
        for t in free_tables
    ]

    return JSONResponse(
        {
            "free_tables": free_tables_data,
            "data": {
                "date": date,
                "time_start": time_start,
                "time_end": time_end,
                "guests": guests,
                "comment": comment,
            },
        }
    )


@app.post("/booking/confirm")
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
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        return JSONResponse(
            {"error": "Необходимо войти в аккаунт."},
            status_code=401,
        )

    user_id = int(user_id_cookie)

    try:
        res_date = parse_date(date)
        res_start = parse_time(time_start)
        res_end = parse_time(time_end)
    except Exception:
        return JSONResponse(
            {"error": "Неверный формат даты или времени."},
            status_code=400,
        )

    if res_date < date_type.today():
        return JSONResponse(
            {"error": "Нельзя создать бронь на прошедшую дату."},
            status_code=400,
        )

    if res_end <= res_start:
        return JSONResponse(
            {"error": "Время окончания должно быть позже времени начала."},
            status_code=400,
        )

    table_query = select(RestaurantTable).where(RestaurantTable.id == table_id)
    table_result = await db.execute(table_query)
    table = table_result.scalar_one_or_none()

    if not table:
        return JSONResponse(
            {"error": "Столик не найден."},
            status_code=400,
        )

    if guests > table.cnt_seats:
        return JSONResponse(
            {"error": f"Столик вмещает только {table.cnt_seats} гостей."},
            status_code=400,
        )

    existing_reservation_query = select(Reservation).where(
        and_(
            Reservation.table_id == table_id,
            Reservation.reservation_date == res_date,
            Reservation.status != "cancelled",
            Reservation.reservation_end_time > res_start,
            Reservation.reservation_start_time < res_end,
        )
    )
    existing_reservation_result = await db.execute(existing_reservation_query)
    existing_reservation = existing_reservation_result.first()

    if existing_reservation:
        return JSONResponse(
            {"error": "Столик уже забронирован на это время."},
            status_code=400,
        )

    stmt = insert(Reservation).values(
        user_id=user_id,
        table_id=table_id,
        reservation_date=res_date,
        reservation_start_time=res_start,
        reservation_end_time=res_end,
        guests_count=guests,
        status="confirmed",
        comment=comment or None,
    )

    try:
        await db.execute(stmt)
        await db.commit()
    except Exception as e:
        await db.rollback()
        return JSONResponse(
            {"error": f"Ошибка при сохранении брони: {e}"},
            status_code=500,
        )

    return JSONResponse(
        {
            "success": True,
            "message": "Бронирование успешно создано!",
        },
        status_code=200,
    )


@app.get("/api/my_reservations")
async def my_reservations(request: Request, db: AsyncSession = Depends(get_db)):
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        return JSONResponse(
            {"error": "Необходимо войти в аккаунт."},
            status_code=401,
        )

    user_id = int(user_id_cookie)
    today = date_type.today()

    res_query = (
        select(Reservation)
        .where(
            and_(
                Reservation.user_id == user_id,
                Reservation.status == "confirmed",
                Reservation.reservation_date >= today,
            )
        )
        .order_by(
            Reservation.reservation_date,
            Reservation.reservation_start_time,
        )
    )

    res_result = await db.execute(res_query)
    reservations = res_result.scalars().all()

    data = []
    for r in reservations:
        data.append(
            {
                "id": r.id,
                "date": r.reservation_date.isoformat(),
                "time_start": r.reservation_start_time.strftime("%H:%M"),
                "time_end": r.reservation_end_time.strftime("%H:%M"),
                "table_id": r.table_id,
                "guests": r.guests_count,
            }
        )

    return JSONResponse({"success": True, "reservations": data})


@app.post("/orders/create")
async def create_order(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id_cookie = request.cookies.get("user_id")
    if not user_id_cookie:
        return JSONResponse(
            {"error": "Необходимо войти в аккаунт для оформления заказа."},
            status_code=401,
        )

    user_id = int(user_id_cookie)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse(
            {"error": "Некорректный формат данных (ожидается JSON)."},
            status_code=400,
        )

    items = data.get("items") or []
    reservation_id = data.get("reservation_id")

    if not items:
        return JSONResponse(
            {"error": "Список блюд пуст."},
            status_code=400,
        )

    reservation_obj = None
    if reservation_id is not None:
        try:
            reservation_id_int = int(reservation_id)
        except Exception:
            return JSONResponse(
                {"error": "Некорректный идентификатор брони."},
                status_code=400,
            )

        res_query = select(Reservation).where(
            and_(
                Reservation.id == reservation_id_int,
                Reservation.user_id == user_id,
                Reservation.status != "cancelled",
            )
        )
        res_result = await db.execute(res_query)
        reservation_obj = res_result.scalar_one_or_none()

        if not reservation_obj:
            return JSONResponse(
                {
                    "error": "Выбранная бронь не найдена или не принадлежит вам."
                },
                status_code=400,
            )

    try:
        menu_item_ids = [int(it["menu_item_id"]) for it in items]
    except Exception:
        return JSONResponse(
            {"error": "Некорректные данные по блюдам."},
            status_code=400,
        )

    db_items_result = await db.execute(
        select(MenuItem).where(MenuItem.id.in_(menu_item_ids))
    )
    db_items = db_items_result.scalars().all()
    db_items_map = {m.id: m for m in db_items}

    if len(db_items_map) != len(set(menu_item_ids)):
        return JSONResponse(
            {"error": "Некоторые блюда не найдены в меню."},
            status_code=400,
        )

    total_amount = Decimal("0.00")
    order_items_models = []

    for it in items:
        mid = int(it["menu_item_id"])
        try:
            cnt = int(it.get("cnt", 1))
        except Exception:
            return JSONResponse(
                {"error": "Количество должно быть целым числом."},
                status_code=400,
            )

        if cnt <= 0:
            return JSONResponse(
                {"error": "Количество должно быть больше 0."},
                status_code=400,
            )

        menu_item = db_items_map[mid]
        price = Decimal(str(menu_item.price))

        total_amount += price * cnt

        order_items_models.append(
            OrderItem(
                menu_item_id=mid,
                cnt=cnt,
                price=price,
            )
        )

    new_order = Order(
        user_id=user_id,
        reservation_id=reservation_obj.id if reservation_obj else None,
        status="new",
        total_amount=total_amount,
    )

    db.add(new_order)
    await db.flush()

    for oi in order_items_models:
        oi.order_id = new_order.id
        db.add(oi)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        return JSONResponse(
            {"error": f"Ошибка при создании заказа: {e}"},
            status_code=500,
        )

    return JSONResponse(
        {
            "success": True,
            "order_id": new_order.id,
            "message": "Заказ успешно создан!",
            "total_amount": str(total_amount),
            "reservation_id": reservation_obj.id if reservation_obj else None,
        },
        status_code=200,
    )
