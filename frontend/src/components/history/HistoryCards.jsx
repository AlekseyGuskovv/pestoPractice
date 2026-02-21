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

export function ReservationCard({ reservation: r }) {
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

export function OrderCard({ order: o }) {
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
