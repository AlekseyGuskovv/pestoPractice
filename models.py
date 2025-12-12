from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    TIMESTAMP,
    Boolean,
    Date,
    Time,
    ForeignKey,
    Numeric,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
    )
    role = Column(String(20), nullable=False, server_default="user")


class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, nullable=False, unique=True)
    cnt_seats = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, server_default="true")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    table_id = Column(
        Integer,
        ForeignKey("restaurant_tables.id", ondelete="CASCADE"),
        nullable=False,
    )

    reservation_date = Column(Date, nullable=False)
    reservation_start_time = Column(Time, nullable=False)
    reservation_end_time = Column(Time, nullable=False)

    guests_count = Column(Integer, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        server_default="new",
    )

    comment = Column(Text)

    created_at = Column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    key = Column(String(100), nullable=False, unique=True)

    items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)

    category_id = Column(
        Integer,
        ForeignKey("menu_categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(150), nullable=False)
    description = Column(Text)
    weight = Column(Integer)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(Text)

    category = relationship("MenuCategory", back_populates="items")

    order_items = relationship("OrderItem", back_populates="menu_item")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    reservation_id = Column(
        Integer,
        ForeignKey("reservations.id", ondelete="SET NULL"),
        nullable=True,
    )

    status = Column(String(20), nullable=False, server_default="new")
    total_amount = Column(Numeric(10, 2), nullable=False, server_default="0")
    created_at = Column(
        TIMESTAMP,
        nullable=False,
        server_default=func.now(),
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
    )

    cnt = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")
