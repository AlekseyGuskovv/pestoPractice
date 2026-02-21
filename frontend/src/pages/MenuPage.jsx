import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CartModal from "../components/menu/CartModal";
import DishCard from "../components/menu/DishCard";
import TopNav from "../shared/ui/TopNav";
import { getMenu, getMyReservations } from "../shared/api/menu";
import { createOrder } from "../shared/api/orders";
import { isLoggedIn } from "../shared/utils/cookies";
import "../styles/pesto_menu.css";

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
    getMenu()
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
      getMyReservations()
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
      const data = await createOrder(payload);

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
