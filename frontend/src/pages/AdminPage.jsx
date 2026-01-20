import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "../utils/api";
import { OrdersTable, ReservationsTable } from "../components/admin/AdminTables";
import {
  MenuManagement,
  TablesManagement,
} from "../components/admin/AdminForms";
import "../styles/pesto_admin.css";

export default function AdminPage() {
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchJSON("/admin/api/dashboard");
      setReservations(data.reservations || []);
      setOrders(data.orders || []);
    } catch (err) {
      setGlobalError("Ошибка загрузки дашборда: " + err.message);
    }
  }, []);

  const loadMenuAndTables = useCallback(async () => {
    try {
      const [menuData, tablesData] = await Promise.all([
        fetchJSON("/admin/api/menu"),
        fetchJSON("/admin/api/tables"),
      ]);
      setCategories(menuData.categories || []);
      setMenuItems(menuData.items || []);
      setTables(tablesData.tables || []);
    } catch (err) {
      setGlobalError("Ошибка загрузки меню или столиков: " + err.message);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadMenuAndTables();
  }, [loadDashboard, loadMenuAndTables]);

  const saveReservationStatus = async (id, status) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      await fetchJSON(`/admin/api/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setGlobalSuccess(`Статус брони #${id} обновлён.`);
      await loadDashboard();
    } catch (err) {
      setGlobalError(`Ошибка смены статуса брони #${id}: ` + err.message);
    }
  };

  const saveOrderStatus = async (id, status) => {
    setGlobalError("");
    setGlobalSuccess("");
    try {
      await fetchJSON(`/admin/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setGlobalSuccess(`Статус заказа #${id} обновлён.`);
      await loadDashboard();
    } catch (err) {
      setGlobalError(`Ошибка смены статуса заказа #${id}: ` + err.message);
    }
  };

  return (
    <>
      <header className="top-nav">
        <div className="nav-center">
          <span className="admin-header-title">Админ-панель</span>
        </div>
        <div className="nav-right">
          <a href="/logout" className="nav-btn logout-btn">
            Выйти
          </a>
        </div>
      </header>

      <main className="admin-page">
        <div className="container">
          <h1 className="admin-title">Админ-панель ресторана</h1>
          <p className="admin-subtitle">
            Управляйте заказами, бронированиями, меню и столиками.
          </p>

          {globalError && (
            <div className="admin-messages error">{globalError}</div>
          )}
          {globalSuccess && (
            <div className="admin-messages success">{globalSuccess}</div>
          )}

          <section id="orders-tab">
            <div className="admin-card">
              <h2 className="admin-section-title">Все бронирования</h2>
              <ReservationsTable
                reservations={reservations}
                onSaveStatus={saveReservationStatus}
              />

              <h2 className="admin-section-title admin-section-title-spaced">
                Все заказы
              </h2>
              <OrdersTable orders={orders} onSaveStatus={saveOrderStatus} />
            </div>
          </section>

          <section id="menu-tab">
            <div className="admin-card">
              <MenuManagement
                categories={categories}
                items={menuItems}
                onReload={loadMenuAndTables}
              />
              <TablesManagement tables={tables} onReload={loadMenuAndTables} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
