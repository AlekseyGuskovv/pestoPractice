# Pesto

Веб-приложение учебного ресторана: меню, бронирование столиков, заказы, личная история и админ-панель.

Репозиторий: [github.com/AlekseyGuskovv/pestoPractice](https://github.com/AlekseyGuskovv/pestoPractice)

---

## О проекте

**Pesto** — учебный fullstack-проект, разрабатываемый поэтапно с нуля. Цели: практика проектирования веб-приложения, работа с Git и переход от монолитных HTML-страниц к SPA со слоистой архитектурой (Clean Architecture).

Текущая версия — **React SPA + FastAPI API** с PostgreSQL.

---

## Возможности

**Для гостя:** главная страница, меню с корзиной и заказом, бронирование столиков, история броней и заказов, регистрация и вход.

**Для администратора (роль `manager`):** дашборд бронирований и заказов, смена статусов, управление меню и столиками.

---

## Стек технологий

| Слой | Технологии |
|------|------------|
| Backend | Python, FastAPI, SQLAlchemy (async), asyncpg, Uvicorn |
| Frontend | React 19, Vite 6, React Router 7 |
| База данных | PostgreSQL (`pesto_db`) |
| Инфра | Git, GitHub |

---

## Архитектура

Проект следует **Clean Architecture**: зависимости направлены от внешних слоёв к внутренним.

### Backend

```
HTTP → API (routes) → Services → Repositories → Models → PostgreSQL
```

Точка входа: `main.py` → `create_app()` в `app/factory.py`.

### Frontend

```
pages → components → shared/api, shared/ui, shared/utils → FastAPI
```

Все HTTP-запросы идут через `frontend/src/shared/api/client.js`.

---

## Структура репозитория

```
pestoPractice/
├── app/                    # Backend
│   ├── factory.py          # create_app(), CORS, static
│   ├── core/               # config, deps, security
│   ├── database/           # engine, session
│   ├── models/             # ORM-модели
│   ├── repositories/       # доступ к данным
│   ├── services/           # бизнес-логика
│   └── api/                # routes + admin
├── frontend/
│   └── src/
│       ├── app/            # App + router
│       ├── pages/
│       ├── components/
│       ├── shared/         # api, ui, utils
│       └── styles/
├── static/                 # изображения меню
├── scripts/init_db.py      # создание таблиц
├── main.py
├── requirements.txt
└── .env.example
```

---

## Запуск

### Требования

Python 3.11+, Node.js 18+, PostgreSQL 14+.

### 1. База данных

```sql
CREATE DATABASE pesto_db;
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # укажите DB_PASSWORD
python scripts/init_db.py         # при первом запуске
uvicorn main:app --reload
```

Backend: http://127.0.0.1:8000

### 3. Frontend (разработка)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173 — Vite проксирует API на backend.

### 4. Production

```bash
cd frontend && npm run build
uvicorn main:app --host 0.0.0.0 --port 8000
```

FastAPI отдаёт SPA из `frontend/dist`.
