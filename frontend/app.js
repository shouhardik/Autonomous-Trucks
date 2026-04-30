const api = {
  trucks: "/api/trucks",
  customers: "/api/customers",
  loads: "/api/loads",
};

let customersCache = [];
let loadsCache = [];

const trucksTbody = document.querySelector("#trucksTable tbody");
const customersTbody = document.querySelector("#customersTable tbody");
const loadsTbody = document.querySelector("#loadsTable tbody");
const fleetStats = document.querySelector("#fleetStats");

const customerForm = document.querySelector("#customerForm");
const customerIdField = document.querySelector("#customerId");
const resetCustomerBtn = document.querySelector("#resetCustomer");

const loadForm = document.querySelector("#loadForm");
const loadIdField = document.querySelector("#loadId");
const customerSelect = document.querySelector("#customer_id");
const resetLoadBtn = document.querySelector("#resetLoad");

async function http(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

function renderTrucks(trucks) {
  trucksTbody.innerHTML = trucks
    .map(
      (t) => `
    <tr>
      <td>${t.truck_id}</td>
      <td>${t.status}</td>
      <td>${t.location}</td>
      <td>${t.battery_percent}%</td>
      <td>${t.speed_kmh}</td>
    </tr>
  `
    )
    .join("");

  const active = trucks.filter((t) => t.status === "On Route").length;
  const charging = trucks.filter((t) => t.status === "Charging").length;
  const avgBattery = Math.round(trucks.reduce((sum, t) => sum + t.battery_percent, 0) / (trucks.length || 1));
  fleetStats.innerHTML = `
    <div>Total Trucks: ${trucks.length}</div>
    <div>Active: ${active}</div>
    <div>Charging: ${charging}</div>
    <div>Avg Battery: ${avgBattery}%</div>
  `;
}

function renderCustomers() {
  customersTbody.innerHTML = customersCache
    .map(
      (c) => `
      <tr>
        <td>${c.full_name}</td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td>${c.company_name || "-"}</td>
        <td class="table-actions">
          <button onclick="editCustomer(${c.id})">Edit</button>
          <button class="danger" onclick="deleteCustomer(${c.id})">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  const options = customersCache
    .map((c) => `<option value="${c.id}">${c.full_name} (ID ${c.id})</option>`)
    .join("");
  customerSelect.innerHTML = options || '<option value="">Add a customer first</option>';
}

function renderLoads() {
  loadsTbody.innerHTML = loadsCache
    .map(
      (l) => `
      <tr>
        <td>${l.customer_name}</td>
        <td>${l.origin} -> ${l.destination}</td>
        <td>${l.cargo_type}</td>
        <td>${l.weight_kg}</td>
        <td>${l.status}</td>
        <td class="table-actions">
          <button onclick="editLoad(${l.id})">Edit</button>
          <button class="danger" onclick="deleteLoad(${l.id})">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");
}

async function loadAll() {
  try {
    const [trucks, customers, loads] = await Promise.all([
      http(api.trucks),
      http(api.customers),
      http(api.loads),
    ]);
    customersCache = customers;
    loadsCache = loads;
    renderTrucks(trucks);
    renderCustomers();
    renderLoads();
  } catch (err) {
    alert(err.message);
  }
}

customerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    full_name: document.querySelector("#full_name").value.trim(),
    email: document.querySelector("#email").value.trim(),
    phone: document.querySelector("#phone").value.trim(),
    company_name: document.querySelector("#company_name").value.trim(),
    address: document.querySelector("#address").value.trim(),
  };
  const id = customerIdField.value;
  await http(id ? `${api.customers}/${id}` : api.customers, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
  customerForm.reset();
  customerIdField.value = "";
  await loadAll();
});

loadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    customer_id: Number(customerSelect.value),
    origin: document.querySelector("#origin").value.trim(),
    destination: document.querySelector("#destination").value.trim(),
    cargo_type: document.querySelector("#cargo_type").value.trim(),
    weight_kg: Number(document.querySelector("#weight_kg").value),
    pickup_date: document.querySelector("#pickup_date").value,
    delivery_date: document.querySelector("#delivery_date").value,
    status: document.querySelector("#load_status").value.trim(),
    assigned_truck_id: document.querySelector("#assigned_truck_id").value.trim(),
  };
  const id = loadIdField.value;
  await http(id ? `${api.loads}/${id}` : api.loads, {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
  loadForm.reset();
  loadIdField.value = "";
  await loadAll();
});

resetCustomerBtn.addEventListener("click", () => {
  customerForm.reset();
  customerIdField.value = "";
});

resetLoadBtn.addEventListener("click", () => {
  loadForm.reset();
  loadIdField.value = "";
});

window.editCustomer = (id) => {
  const c = customersCache.find((item) => item.id === id);
  if (!c) return;
  customerIdField.value = c.id;
  document.querySelector("#full_name").value = c.full_name;
  document.querySelector("#email").value = c.email;
  document.querySelector("#phone").value = c.phone;
  document.querySelector("#company_name").value = c.company_name || "";
  document.querySelector("#address").value = c.address;
};

window.deleteCustomer = async (id) => {
  if (!confirm("Delete this customer?")) return;
  try {
    await http(`${api.customers}/${id}`, { method: "DELETE" });
    await loadAll();
  } catch (err) {
    alert(err.message);
  }
};

window.editLoad = (id) => {
  const l = loadsCache.find((item) => item.id === id);
  if (!l) return;
  loadIdField.value = l.id;
  customerSelect.value = l.customer_id;
  document.querySelector("#origin").value = l.origin;
  document.querySelector("#destination").value = l.destination;
  document.querySelector("#cargo_type").value = l.cargo_type;
  document.querySelector("#weight_kg").value = l.weight_kg;
  document.querySelector("#pickup_date").value = l.pickup_date;
  document.querySelector("#delivery_date").value = l.delivery_date;
  document.querySelector("#load_status").value = l.status;
  document.querySelector("#assigned_truck_id").value = l.assigned_truck_id || "";
};

window.deleteLoad = async (id) => {
  if (!confirm("Delete this load?")) return;
  await http(`${api.loads}/${id}`, { method: "DELETE" });
  await loadAll();
};

loadAll();
