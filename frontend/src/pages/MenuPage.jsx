import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import { fetchJSON } from "../utils/api";
import { isLoggedIn } from "../utils/cookies";
import { resolveImageUrl } from "../utils/images";
import "../styles/pesto_menu.css";

function DishCard({ item, onAddToCart }) {
  const [qty, setQty] = useState(1);

  const decrease = () => setQty((v) => (v <= 1 ? 1 : v - 1));
  const increase = () => setQty((v) => v + 1);

  const handleAdd = () => {
    const safeQty = qty >= 1 ? qty : 1;
    onAddToCart(item, safeQty);
  };

  const imageUrl = resolveImageUrl(item.image_url);
  const imageStyle = imageUrl
    ? {
        backgroundImage: `url('${imageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="dish-card" data-category={item.category?.key || ""}>
      <div className="dish-image" style={imageStyle} />

      <h3>{item.name}</h3>

      <div className="dish-info">
        <span className="dish-weight">{item.weight ? `${item.weight} г` : "\u00a0"}</span>
        <span className="dish-price">
          {item.price != null ? `${item.price} ₽` : ""}
        </span>
      </div>

      <p className="dish-desc">{item.description || "\u00a0"}</p>

      <div className="dish-actions">
        <div className="qty">
          <button type="button" className="qty-btn qty-minus" onClick={decrease}>
            −
          </button>
          <input
            type="number"
            className="qty-input"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
          <button type="button" className="qty-btn qty-plus" onClick={increase}>
            +
          </button>
        </div>
        <button type="button" className="add-to-cart-btn" onClick={handleAdd}>
          В корзину
        </button>
      </div>
    </div>
  );
}

function CartModal({
  cartItems,
  reservations,
  reservationId,
  onReservationChange,
  onClose,
  onConfirm,
}) {
  const totalAmount = cartItems.reduce((sum, it) => sum + it.qty * it.price, 0);

  return (
    <div className="modal-bg" style={{ display: "flex" }} onClick={onClose}>
      <div
        className="cart-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Ваш заказ</h2>

        <div className="cart-modal-list">
          {cartItems.length === 0 ? (
            <p>Корзина пуста.</p>
          ) : (
            cartItems.map((it) => (
              <div key={it.id} className="cart-modal-item">
                <span>{it.name}</span>
                <span>{it.qty} шт.</span>
                <span>{(it.price * it.qty).toFixed(2)} ₽</span>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-modal-total">Итого: {totalAmount.toFixed(2)} ₽</div>
        )}

        <div className="cart-reservation">
          <label htmlFor="reservation-select">Привязать к брони (необязательно):</label>
          <select
            id="reservation-select"
            className="reservation-select"
            value={reservationId}
            onChange={(e) => onReservationChange(e.target.value)}
          >
            <option value="">Не привязывать</option>
            {reservations.map((r) => (
              <option key={r.id} value={r.id}>
                {`Бронь #${r.id} • ${r.date} ${r.time_start} • ${r.guests} гость(я)`}
              </option>
            ))}
          </select>
        </div>

        <div className="cart-modal-actions">
          <button type="button" className="btn-close" onClick={onClose}>
            Продолжить выбор
          </button>
          <button type="button" className="cart-modal-confirm" onClick={onConfirm}>
            Подтвердить заказ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [reservationId, setReservationId] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchJSON("/api/menu")
      .then((data) => {
        setCategories(data.categories || []);
        setItems(data.items || []);
      })
      .catch((err) => {
        const msg = err.message || "";
        if (
          msg.includes("HTTP 500") ||
          msg.includes("HTTP 502") ||
          msg.includes("HTTP 503") ||
          msg.includes("ECONNREFUSED") ||
          msg.includes("Failed to fetch")
        ) {
          setLoadError(
            "Не удалось загрузить меню. Запустите PostgreSQL и backend в отдельном терминале: uvicorn main:app --reload"
          );
        } else {
          setLoadError(msg || "Ошибка загрузки меню");
        }
      })
      .finally(() => setLoading(false));

    if (isLoggedIn()) {
      fetchJSON("/api/my_reservations")
        .then((data) => setReservations(data.reservations || []))
        .catch(console.error);
    }
  }, []);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category?.key === activeCategory);
  }, [items, activeCategory]);

  const cartItems = Object.values(cart);

  const cartLabel = useMemo(() => {
    if (cartItems.length === 0) return "Корзина пуста";
    const totalQty = cartItems.reduce((sum, it) => sum + it.qty, 0);
    const totalAmount = cartItems.reduce((sum, it) => sum + it.qty * it.price, 0);
    return `Корзина: ${totalQty} • ${totalAmount.toFixed(2)} ₽`;
  }, [cartItems]);

  const addToCart = (item, qty) => {
    const price = parseFloat(item.price);
    setCart((prev) => {
      const existing = prev[item.id];
      if (!existing) {
        return {
          ...prev,
          [item.id]: { id: item.id, name: item.name, price, qty },
        };
      }
      return {
        ...prev,
        [item.id]: { ...existing, qty: existing.qty + qty },
      };
    });
  };

  const confirmOrder = async () => {
    if (!isLoggedIn()) {
      alert("Чтобы оформить заказ, пожалуйста, войдите в аккаунт.");
      navigate("/login");
      return;
    }

    const orderItems = cartItems.map((it) => ({
      menu_item_id: it.id,
      cnt: it.qty,
    }));

    if (orderItems.length === 0) {
      alert("Корзина пуста.");
      return;
    }

    const payload = { items: orderItems };
    if (reservationId) {
      payload.reservation_id = parseInt(reservationId, 10);
    }

    try {
      const data = await fetchJSON("/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let text = `Заказ №${data.order_id} успешно создан! Сумма: ${data.total_amount} ₽`;
      if (data.reservation_id) {
        text += ` (привязан к брони №${data.reservation_id})`;
      }
      setOrderMessage(text);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setCart({});
      setModalOpen(false);
    } catch (err) {
      alert(err.message || "Произошла ошибка при отправке заказа.");
    }
  };

  return (
    <>
      <TopNav
        showCart
        cartLabel={cartLabel}
        cartDisabled={cartItems.length === 0}
        onCartClick={() => cartItems.length > 0 && setModalOpen(true)}
      />

      <main className="menu-page">
        <div className="container">
          <h1 className="menu-title">Меню ресторана Pesto</h1>
          <p className="menu-subtitle">
            Выберите блюда, укажите количество и оформите заказ онлайн
          </p>

          {orderMessage && (
            <div className="order-message visible">{orderMessage}</div>
          )}

          {loadError && (
            <p style={{ color: "#b00020", textAlign: "center" }}>{loadError}</p>
          )}

          <div className="menu-categories">
            <button
              type="button"
              className={`category-btn ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              Все
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-btn ${activeCategory === cat.key ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Загрузка меню...</p>
          ) : (
            <div className="dish-grid">
              {filteredItems.map((item) => (
                <DishCard key={item.id} item={item} onAddToCart={addToCart} />
              ))}
            </div>
          )}
        </div>

        {modalOpen && (
          <CartModal
            cartItems={cartItems}
            reservations={reservations}
            reservationId={reservationId}
            onReservationChange={setReservationId}
            onClose={() => setModalOpen(false)}
            onConfirm={confirmOrder}
          />
        )}
      </main>
    </>
  );
}
