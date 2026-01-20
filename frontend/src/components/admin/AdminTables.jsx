import { useEffect, useState } from "react";

const RES_STATUSES = [
  { value: "confirmed", label: "Подтверждено" },
  { value: "cancelled", label: "Отменено" },
  { value: "completed", label: "Завершено" },
];

const ORDER_STATUSES = [
  { value: "new", label: "В процессе" },
  { value: "served", label: "Подано" },
  { value: "cancelled", label: "Отменён" },
];

function StatusSelect({ value, options, onChange, className }) {
  const statuses = [...options];
  if (value && !statuses.some((s) => s.value === value)) {
    statuses.push({ value, label: value });
  }

  return (
    <select
      className={`admin-status-select ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function ReservationsTable({ reservations, onSaveStatus }) {
  const [statuses, setStatuses] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const initial = {};
    reservations.forEach((r) => {
      initial[r.id] = r.status;
    });
    setStatuses(initial);
  }, [reservations]);

  if (!reservations.length) {
    return <p>Бронирований пока нет.</p>;
  }

  const handleSave = async (id) => {
    setSavingId(id);
    try {
      await onSaveStatus(id, statuses[id]);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Дата</th>
            <th>Время</th>
            <th>Столик</th>
            <th>Гостей</th>
            <th>Пользователь</th>
            <th>Комментарий</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.date}</td>
              <td>
                {r.time_start}–{r.time_end}
              </td>
              <td>№{r.table_number}</td>
              <td>{r.guests}</td>
              <td>{r.user_email}</td>
              <td className="comment">{r.comment || ""}</td>
              <td>
                <StatusSelect
                  value={statuses[r.id] ?? r.status}
                  options={RES_STATUSES}
                  className="res-status-select"
                  onChange={(val) =>
                    setStatuses((prev) => ({ ...prev, [r.id]: val }))
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  className="admin-status-save-btn res-status-save"
                  disabled={savingId === r.id}
                  onClick={() => handleSave(r.id)}
                >
                  Сохранить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrdersTable({ orders, onSaveStatus }) {
  const [statuses, setStatuses] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const initial = {};
    orders.forEach((o) => {
      initial[o.id] = o.status;
    });
    setStatuses(initial);
  }, [orders]);

  if (!orders.length) {
    return <p>Заказов пока нет.</p>;
  }

  const handleSave = async (id) => {
    setSavingId(id);
    try {
      await onSaveStatus(id, statuses[id]);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Создан</th>
            <th>Сумма</th>
            <th>ID брони</th>
            <th>Пользователь</th>
            <th>Состав заказа</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.created_at}</td>
              <td>{o.total_amount} ₽</td>
              <td>{o.reservation_id || ""}</td>
              <td>{o.user_email}</td>
              <td className="order-items">
                {(o.items || []).map((it, idx) => (
                  <span key={idx}>
                    {it.name} × {it.cnt} ({it.price} ₽) = {it.total} ₽
                    {idx < o.items.length - 1 && <br />}
                  </span>
                ))}
              </td>
              <td>
                <StatusSelect
                  value={statuses[o.id] ?? o.status}
                  options={ORDER_STATUSES}
                  className="ord-status-select"
                  onChange={(val) =>
                    setStatuses((prev) => ({ ...prev, [o.id]: val }))
                  }
                />
              </td>
              <td>
                <button
                  type="button"
                  className="admin-status-save-btn ord-status-save"
                  disabled={savingId === o.id}
                  onClick={() => handleSave(o.id)}
                >
                  Сохранить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
