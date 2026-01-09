// Слишком много js логики ,так что решил вынести в отдельный файл
document.addEventListener("DOMContentLoaded", () => {

const globalError = document.getElementById("admin-global-error");
const globalSuccess = document.getElementById("admin-global-success");

function showGlobalError(msg) {
  globalError.textContent = msg || "";
}
function showGlobalSuccess(msg) {
  globalSuccess.textContent = msg || "";
}

async function fetchJSON(url, options = {}) {
  const resp = await fetch(url, options);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.error) {
    throw new Error(data.error || data.detail || ("HTTP " + resp.status));
  }
  return data;
}

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

function buildStatusSelectHTML(current, list, selectClass) {
  const statuses = list.slice();
  if (current && !statuses.some((s) => s.value === current)) {
    statuses.push({ value: current, label: current });
  }

  return (
    `<select class="admin-status-select ${selectClass}">` +
    statuses
      .map(
        (s) =>
          `<option value="${s.value}" ${
            s.value === current ? "selected" : ""
          }>${s.label}</option>`
      )
      .join("") +
    `</select>`
  );
}

async function loadDashboard() {
  try {
    const data = await fetchJSON("/admin/api/dashboard");
    renderReservations(data.reservations || []);
    renderOrders(data.orders || []);
  } catch (e) {
    showGlobalError("Ошибка загрузки дашборда: " + e.message);
  }
}

function renderReservations(list) {
  const container = document.getElementById("reservations-container");
  if (!list.length) {
    container.innerHTML = "<p>Бронирований пока нет.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th><th>Дата</th><th>Время</th><th>Столик</th><th>Гостей</th>
          <th>Пользователь</th><th>Комментарий</th><th>Статус</th><th></th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const r of list) {
    const selectHtml = buildStatusSelectHTML(r.status, RES_STATUSES, "res-status-select");
    html += `
      <tr data-res-id="${r.id}">
        <td>${r.id}</td>
        <td>${r.date}</td>
        <td>${r.time_start}–${r.time_end}</td>
        <td>№${r.table_number}</td>
        <td>${r.guests}</td>
        <td>${r.user_email}</td>
        <td>${r.comment || ""}</td>
        <td>${selectHtml}</td>
        <td><button type="button" class="admin-status-save-btn res-status-save">Сохранить</button></td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  container.innerHTML = html;

  document.querySelectorAll(".res-status-save").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = Number(row.dataset.resId);
      const select = row.querySelector(".res-status-select");
      const newStatus = select.value;

      showGlobalError("");
      showGlobalSuccess("");

      try {
        await fetchJSON(`/admin/api/reservations/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        showGlobalSuccess(`Статус брони #${id} обновлён.`);
        await loadDashboard();
      } catch (e) {
        showGlobalError(`Ошибка смены статуса брони #${id}: ` + e.message);
      }
    });
  });
}

function renderOrders(list) {
  const container = document.getElementById("orders-container");
  if (!list.length) {
    container.innerHTML = "<p>Заказов пока нет.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th><th>Создан</th><th>Сумма</th><th>ID брони</th>
          <th>Пользователь</th><th>Состав заказа</th><th>Статус</th><th></th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const o of list) {
    const itemsHtml = (o.items || [])
      .map((it) => `${it.name} × ${it.cnt} (${it.price} ₽) = ${it.total} ₽`)
      .join("<br>");
    const selectHtml = buildStatusSelectHTML(o.status, ORDER_STATUSES, "ord-status-select");

    html += `
      <tr data-order-id="${o.id}">
        <td>${o.id}</td>
        <td>${o.created_at}</td>
        <td>${o.total_amount} ₽</td>
        <td>${o.reservation_id || ""}</td>
        <td>${o.user_email}</td>
        <td>${itemsHtml}</td>
        <td>${selectHtml}</td>
        <td><button type="button" class="admin-status-save-btn ord-status-save">Сохранить</button></td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  container.innerHTML = html;

  document.querySelectorAll(".ord-status-save").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = Number(row.dataset.orderId);
      const select = row.querySelector(".ord-status-select");
      const newStatus = select.value;

      showGlobalError("");
      showGlobalSuccess("");

      try {
        await fetchJSON(`/admin/api/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        showGlobalSuccess(`Статус заказа #${id} обновлён.`);
        await loadDashboard();
      } catch (e) {
        showGlobalError(`Ошибка смены статуса заказа #${id}: ` + e.message);
      }
    });
  });
}

async function loadMenuAndTables() {
  try {
    const [menuData, tablesData] = await Promise.all([
      fetchJSON("/admin/api/menu"),
      fetchJSON("/admin/api/tables"),
    ]);

    fillMenuSelects(menuData);
    fillTableSelects(tablesData.tables || []);
  } catch (e) {
    showGlobalError("Ошибка загрузки меню или столиков: " + e.message);
  }
}

function fillMenuSelects(menuData) {
  const catSelect = document.getElementById("menu-category-id");
  const deleteSelect = document.getElementById("delete-menu-item-id");

  catSelect.innerHTML = '<option value="">Выберите категорию</option>';
  deleteSelect.innerHTML = '<option value="">Выберите блюдо</option>';

  (menuData.categories || []).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    catSelect.appendChild(opt);
  });

  (menuData.items || []).forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = `${item.category_name} — ${item.name} (${item.price} ₽)`;
    deleteSelect.appendChild(opt);
  });
}

function fillTableSelects(tables) {
  const deleteSelect = document.getElementById("delete-table-id");
  deleteSelect.innerHTML = '<option value="">Выберите столик</option>';

  tables.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = `Столик №${t.table_number} • мест: ${t.cnt_seats} • ${
      t.is_active ? "активен" : "неактивен"
    }`;
    deleteSelect.appendChild(opt);
  });
}

document.getElementById("add-menu-item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("menu-messages-error");
  const okBox = document.getElementById("menu-messages-success");
  errBox.textContent = "";
  okBox.textContent = "";

  const body = {
    category_id: Number(document.getElementById("menu-category-id").value),
    name: document.getElementById("menu-name").value.trim(),
    price: document.getElementById("menu-price").value.trim(),
    weight: document.getElementById("menu-weight").value.trim() || null,
    image_url: document.getElementById("menu-image-url").value.trim() || null,
    description: document.getElementById("menu-description").value.trim() || null,
  };

  try {
    await fetchJSON("/admin/api/menu/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    okBox.textContent = "Блюдо успешно добавлено.";
    e.target.reset();
    await loadMenuAndTables();
  } catch (err) {
    errBox.textContent = "Ошибка добавления блюда: " + err.message;
  }
});

document.getElementById("delete-menu-item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("menu-messages-error");
  const okBox = document.getElementById("menu-messages-success");
  errBox.textContent = "";
  okBox.textContent = "";

  const id = document.getElementById("delete-menu-item-id").value;
  if (!id) return;

  if (!confirm("Удалить блюдо ID " + id + "?")) return;

  try {
    await fetchJSON(`/admin/api/menu/items/${id}`, { method: "DELETE" });
    okBox.textContent = "Блюдо успешно удалено.";
    await loadMenuAndTables();
  } catch (err) {
    errBox.textContent = "Ошибка удаления блюда: " + err.message;
  }
});

document.getElementById("add-table-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("tables-messages-error");
  const okBox = document.getElementById("tables-messages-success");
  errBox.textContent = "";
  okBox.textContent = "";

  const body = {
    table_number: Number(document.getElementById("table-number").value),
    cnt_seats: Number(document.getElementById("table-seats").value),
    is_active: document.getElementById("table-active").value === "true",
  };

  try {
    await fetchJSON("/admin/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    okBox.textContent = "Столик успешно добавлен.";
    e.target.reset();
    document.getElementById("table-active").value = "true";
    await loadMenuAndTables();
  } catch (err) {
    errBox.textContent = "Ошибка добавления столика: " + err.message;
  }
});

document.getElementById("delete-table-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errBox = document.getElementById("tables-messages-error");
  const okBox = document.getElementById("tables-messages-success");
  errBox.textContent = "";
  okBox.textContent = "";

  const id = document.getElementById("delete-table-id").value;
  if (!id) return;

  if (!confirm("Удалить столик ID " + id + "?")) return;

  try {
    await fetchJSON(`/admin/api/tables/${id}`, { method: "DELETE" });
    okBox.textContent = "Столик успешно удалён.";
    await loadMenuAndTables();
  } catch (err) {
    errBox.textContent = "Ошибка удаления столика: " + err.message;
  }
});

(async function initAdmin() {
  await loadDashboard();
  await loadMenuAndTables();
})();
});
