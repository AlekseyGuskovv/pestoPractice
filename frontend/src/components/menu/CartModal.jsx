export default function CartModal({
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
      <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
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
