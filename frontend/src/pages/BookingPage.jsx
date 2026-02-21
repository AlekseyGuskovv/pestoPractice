import { useState } from "react";
import TopNav from "../shared/ui/TopNav";
import { checkTables, confirmBooking } from "../shared/api/booking";
import "../styles/pesto_booking.css";

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [guests, setGuests] = useState(1);
  const [comment, setComment] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [freeTables, setFreeTables] = useState([]);
  const [bookingData, setBookingData] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const onCheckTables = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setFreeTables([]);
    setSelectedTableId(null);
    setBookingData(null);
    setCheckLoading(true);

    try {
      const { resp, data } = await checkTables({
        date,
        time_start: timeStart,
        time_end: timeEnd,
        guests: guests || 1,
        comment: comment || "",
      });

      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      if (!resp.ok) {
        setErrorMessage("Ошибка при поиске столиков.");
        return;
      }

      if (!data.free_tables?.length) {
        setErrorMessage("Свободных столиков не найдено.");
        return;
      }

      setFreeTables(data.free_tables);
      setBookingData(data.data || null);
    } catch (err) {
      setErrorMessage(err.message || "Ошибка при поиске столиков.");
    } finally {
      setCheckLoading(false);
    }
  };

  const onConfirmBooking = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!bookingData) {
      setErrorMessage("Сначала найдите свободный столик.");
      return;
    }
    if (!selectedTableId) {
      setErrorMessage("Выберите столик.");
      return;
    }

    setConfirmLoading(true);

    try {
      const { data } = await confirmBooking({
        date: bookingData.date,
        time_start: bookingData.time_start,
        time_end: bookingData.time_end,
        guests: bookingData.guests,
        comment: bookingData.comment || "",
        table_id: selectedTableId,
      });

      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      if (data.success) {
        setSuccessMessage(data.message || "Бронь успешно создана.");
        setFreeTables([]);
        setSelectedTableId(null);
      }
    } catch (err) {
      setErrorMessage(err.message || "Ошибка при подтверждении брони.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      <TopNav />

      <main className="booking-page">
        <div className="container">
          <h1 className="booking-title">Бронирование столика</h1>
          <p className="booking-page-subtitle">
            Выберите дату, время и количество гостей. Мы предложим вам свободные
            столики.
          </p>

          {errorMessage && (
            <div style={{ color: "#b00020", marginBottom: 10, textAlign: "center" }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div style={{ color: "#2e7d32", marginBottom: 10, textAlign: "center" }}>
              {successMessage}
            </div>
          )}

          <div className="booking-wrapper">
            <form className="booking-card" onSubmit={onCheckTables}>
              <div className="booking-grid">
                <div>
                  <label htmlFor="booking-date">Дата</label>
                  <input
                    type="date"
                    id="booking-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="booking-time-start">Время начала</label>
                  <input
                    type="time"
                    id="booking-time-start"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="booking-time-end">Время окончания</label>
                  <input
                    type="time"
                    id="booking-time-end"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="booking-people">Гостей</label>
                  <input
                    type="number"
                    id="booking-people"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    placeholder="Например, 2"
                    required
                  />
                </div>

                <div className="full-width">
                  <label htmlFor="booking-request">Комментарий к брони</label>
                  <textarea
                    id="booking-request"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Пожелания по столу, повод, аллергии и т.д."
                  />
                </div>
              </div>

              <button type="submit" className="booking-submit" disabled={checkLoading}>
                {checkLoading ? "Ищем свободные столики..." : "Показать свободные столики"}
              </button>
            </form>
          </div>

          {freeTables.length > 0 && (
            <div className="booking-wrapper" style={{ marginTop: 30 }}>
              <div className="booking-card" style={{ marginTop: 10 }}>
                <h2 style={{ textAlign: "center" }}>Выберите столик</h2>

                <div style={{ margin: "15px 0" }}>
                  {freeTables.map((t) => (
                    <label
                      key={t.id}
                      style={{ display: "block", marginBottom: 8, cursor: "pointer" }}
                    >
                      <input
                        type="radio"
                        name="table_id"
                        value={t.id}
                        checked={selectedTableId === t.id}
                        onChange={() => setSelectedTableId(t.id)}
                      />
                      {" "}Столик №{t.table_number} • мест: {t.seats}
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  className="booking-submit"
                  onClick={onConfirmBooking}
                  disabled={confirmLoading || !selectedTableId}
                >
                  {confirmLoading ? "Создаём бронь..." : "Подтвердить бронь"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
