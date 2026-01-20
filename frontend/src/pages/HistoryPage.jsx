import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/TopNav";
import { fetchJSON } from "../utils/api";
import { isLoggedIn } from "../utils/cookies";
import "../styles/pesto_history.css";

function formatDate(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("ru-RU");
}

function formatDateTime(isoDateTime) {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return isoDateTime;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReservationCard({ reservation: r }) {
  return (
    <article className="history-card">
      <div className="history-card-header">
        <span className="history-chip">Столик №{r.table_number}</span>
        <span className={`history-status history-status-${r.status}`}>
          {r.status}
        </span>
      </div>
      <div className="history-card-body">
        <div className="history-row">
          <span className="label">Дата:</span>
          <span className="value">{formatDate(r.date)}</span>
        </div>
        <div className="history-row">
          <span className="label">Время:</span>
          <span className="value">
            {r.time_start}–{r.time_end}
          </span>
        </div>
        <div className="history-row">
          <span className="label">Гостей:</span>
          <span className="value">{r.guests}</span>
        </div>
      </div>
      <div className="history-card-footer">
        <span className="history-id">Бронь №{r.id}</span>
      </div>
    </article>
  );
}

function OrderCard({ order: o }) {
  return (
    <article className="history-card">
      <div className="history-card-header">
        <span className="history-chip">Заказ №{o.id}</span>
        <span className="history-status">{o.status}</span>
      </div>
      <div className="history-card-body">
        <div className="history-row">
          <span className="label">Дата и время:</span>
          <span className="value">{formatDateTime(o.created_at)}</span>
        </div>
        <div className="history-row">
          <span className="label">Сумма:</span>
          <span className="value">{o.total_amount} ₽</span>
        </div>
        <div className="history-row">
          <span className="label">Привязка к брони:</span>
          <span className="value">
            {o.reservation_id ? `Бронь №${o.reservation_id}` : "Нет"}
          </span>
        </div>

        {o.items?.length > 0 && (
          <div className="history-items">
            <div className="history-items-title">Состав заказа:</div>
            <ul>
              {o.items.map((it, idx) => (
                <li key={idx}>
                  <span className="item-name">{it.name}</span>
                  <span className="item-qty">{it.cnt} шт.</span>
                  <span className="item-total">{it.total} ₽</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    fetchJSON("/api/history")
      .then((data) => {
        setReservations(data.reservations || []);
        setOrders(data.orders || []);
      })
      .catch((err) => {
        if (err.message.includes("401") || err.message.includes("войти")) {
          navigate("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <>
      <TopNav />

      <main className="history-page">
        <div className="container">
          <h1 className="history-title">Мои бронирования и заказы</h1>

          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <div className="history-grid">
              <section className="history-section">
                <h2>Бронирования</h2>
                {reservations.length > 0 ? (
                  <div className="history-card-list">
                    {reservations.map((r) => (
                      <ReservationCard key={r.id} reservation={r} />
                    ))}
                  </div>
                ) : (
                  <p className="history-empty">У вас пока нет бронирований.</p>
                )}
              </section>

              <section className="history-section">
                <h2>Заказы</h2>
                {orders.length > 0 ? (
                  <div className="history-card-list">
                    {orders.map((o) => (
                      <OrderCard key={o.id} order={o} />
                    ))}
                  </div>
                ) : (
                  <p className="history-empty">У вас пока нет заказов.</p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
