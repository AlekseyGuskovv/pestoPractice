import { useState } from "react";
import {
  addMenuItem,
  addTable,
  deleteMenuItem,
  deleteTable,
} from "../../shared/api/admin";

export function MenuManagement({ categories, items, onReload }) {
  const [menuError, setMenuError] = useState("");
  const [menuSuccess, setMenuSuccess] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [deleteItemId, setDeleteItemId] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    setMenuError("");
    setMenuSuccess("");

    try {
        await addMenuItem({
          category_id: Number(categoryId),
          name: name.trim(),
          price: price.trim(),
          weight: weight.trim() || null,
          image_url: imageUrl.trim() || null,
          description: description.trim() || null,
        });
      setMenuSuccess("Блюдо успешно добавлено.");
      setCategoryId("");
      setName("");
      setPrice("");
      setWeight("");
      setImageUrl("");
      setDescription("");
      await onReload();
    } catch (err) {
      setMenuError("Ошибка добавления блюда: " + err.message);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setMenuError("");
    setMenuSuccess("");

    if (!deleteItemId) return;
    if (!confirm("Удалить блюдо ID " + deleteItemId + "?")) return;

    try {
        await deleteMenuItem(deleteItemId);
      setMenuSuccess("Блюдо успешно удалено.");
      setDeleteItemId("");
      await onReload();
    } catch (err) {
      setMenuError("Ошибка удаления блюда: " + err.message);
    }
  };

  return (
    <>
      <h2 className="admin-section-title">Работа с меню</h2>

      {menuError && <div className="admin-messages error">{menuError}</div>}
      {menuSuccess && <div className="admin-messages success">{menuSuccess}</div>}

      <h3>Добавить блюдо</h3>
      <form onSubmit={handleAdd}>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="menu-category-id">Категория</label>
            <select
              id="menu-category-id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="menu-name">Название</label>
            <input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="menu-price">Цена</label>
            <input
              id="menu-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="menu-weight">Вес (граммы)</label>
            <input
              id="menu-weight"
              type="number"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="menu-image-url">Изображение (имя файла)</label>
            <input
              id="menu-image-url"
              type="text"
              placeholder="pizza.jpg или /static/menu/pizza.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="menu-description">Описание</label>
            <textarea
              id="menu-description"
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="admin-button">
          Добавить блюдо
        </button>
      </form>

      <h3 className="admin-subsection-title-spaced">Удалить блюдо</h3>
      <form onSubmit={handleDelete}>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="delete-menu-item-id">Выберите блюдо</label>
            <select
              id="delete-menu-item-id"
              value={deleteItemId}
              onChange={(e) => setDeleteItemId(e.target.value)}
              required
            >
              <option value="">Выберите блюдо</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.category_name} — {item.name} ({item.price} ₽)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="admin-button admin-button-danger">
          Удалить блюдо
        </button>
      </form>
    </>
  );
}

export function TablesManagement({ tables, onReload }) {
  const [tablesError, setTablesError] = useState("");
  const [tablesSuccess, setTablesSuccess] = useState("");

  const [tableNumber, setTableNumber] = useState("");
  const [tableSeats, setTableSeats] = useState("");
  const [tableActive, setTableActive] = useState("true");
  const [deleteTableId, setDeleteTableId] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    setTablesError("");
    setTablesSuccess("");

    try {
        await addTable({
          table_number: Number(tableNumber),
          cnt_seats: Number(tableSeats),
          is_active: tableActive === "true",
        });
      setTablesSuccess("Столик успешно добавлен.");
      setTableNumber("");
      setTableSeats("");
      setTableActive("true");
      await onReload();
    } catch (err) {
      setTablesError("Ошибка добавления столика: " + err.message);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setTablesError("");
    setTablesSuccess("");

    if (!deleteTableId) return;
    if (!confirm("Удалить столик ID " + deleteTableId + "?")) return;

    try {
        await deleteTable(deleteTableId);
      setTablesSuccess("Столик успешно удалён.");
      setDeleteTableId("");
      await onReload();
    } catch (err) {
      setTablesError("Ошибка удаления столика: " + err.message);
    }
  };

  return (
    <>
      <h2 className="admin-section-title">Работа со столиками</h2>

      {tablesError && <div className="admin-messages error">{tablesError}</div>}
      {tablesSuccess && (
        <div className="admin-messages success">{tablesSuccess}</div>
      )}

      <h3>Добавить столик</h3>
      <form onSubmit={handleAdd}>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="table-number">Номер столика</label>
            <input
              id="table-number"
              type="number"
              min="1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="table-seats">Количество мест</label>
            <input
              id="table-seats"
              type="number"
              min="1"
              value={tableSeats}
              onChange={(e) => setTableSeats(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="table-active">Активен?</label>
            <select
              id="table-active"
              value={tableActive}
              onChange={(e) => setTableActive(e.target.value)}
            >
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </div>
        </div>

        <button type="submit" className="admin-button">
          Добавить столик
        </button>
      </form>

      <h3>Удалить столик</h3>
      <form onSubmit={handleDelete}>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="delete-table-id">Выберите столик</label>
            <select
              id="delete-table-id"
              value={deleteTableId}
              onChange={(e) => setDeleteTableId(e.target.value)}
              required
            >
              <option value="">Выберите столик</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {`Столик №${t.table_number} • мест: ${t.cnt_seats} • ${
                    t.is_active ? "активен" : "неактивен"
                  }`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="admin-button">
          Удалить столик
        </button>
      </form>
    </>
  );
}
