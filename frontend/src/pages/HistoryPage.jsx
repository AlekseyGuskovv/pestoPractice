import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderCard, ReservationCard } from "../components/history/HistoryCards";
import TopNav from "../shared/ui/TopNav";
import { getHistory } from "../shared/api/history";
import { isLoggedIn } from "../shared/utils/cookies";
import "../styles/pesto_history.css";

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

    getHistory()
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
