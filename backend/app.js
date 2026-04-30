const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "autonomous_trucks.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS trucks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    truck_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    location TEXT NOT NULL,
    battery_percent INTEGER NOT NULL,
    speed_kmh INTEGER NOT NULL,
    last_maintenance TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    company_name TEXT,
    address TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_type TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    pickup_date TEXT NOT NULL,
    delivery_date TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_truck_id TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

const truckCount = db.prepare("SELECT COUNT(*) as count FROM trucks").get().count;
if (truckCount === 0) {
  const insertTruck = db.prepare(`
    INSERT INTO trucks (truck_id, status, location, battery_percent, speed_kmh, last_maintenance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seedTrucks = [
    ["AT-101", "On Route", "Phoenix, AZ", 87, 72, "2026-03-15"],
    ["AT-102", "Charging", "Dallas, TX", 29, 0, "2026-04-02"],
    ["AT-103", "Idle", "Fresno, CA", 94, 0, "2026-03-20"],
    ["AT-104", "Maintenance", "Denver, CO", 65, 0, "2026-04-10"],
  ];
  for (const truck of seedTrucks) insertTruck.run(...truck);
}

app.get("/api/trucks", (_req, res) => {
  const trucks = db.prepare("SELECT * FROM trucks ORDER BY id DESC").all();
  res.json(trucks);
});

app.get("/api/customers", (_req, res) => {
  const customers = db.prepare("SELECT * FROM customers ORDER BY id DESC").all();
  res.json(customers);
});

app.post("/api/customers", (req, res) => {
  const { full_name, email, phone, company_name, address } = req.body;
  if (!full_name || !email || !phone || !address) {
    return res.status(400).json({ message: "full_name, email, phone, and address are required" });
  }
  const result = db
    .prepare(
      "INSERT INTO customers (full_name, email, phone, company_name, address) VALUES (?, ?, ?, ?, ?)"
    )
    .run(full_name, email, phone, company_name || "", address);
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(customer);
});

app.put("/api/customers/:id", (req, res) => {
  const customerId = Number(req.params.id);
  const { full_name, email, phone, company_name, address } = req.body;
  if (!full_name || !email || !phone || !address) {
    return res.status(400).json({ message: "full_name, email, phone, and address are required" });
  }
  const result = db
    .prepare(
      "UPDATE customers SET full_name = ?, email = ?, phone = ?, company_name = ?, address = ? WHERE id = ?"
    )
    .run(full_name, email, phone, company_name || "", address, customerId);

  if (result.changes === 0) return res.status(404).json({ message: "Customer not found" });
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  return res.json(customer);
});

app.delete("/api/customers/:id", (req, res) => {
  const customerId = Number(req.params.id);
  const hasLoads = db.prepare("SELECT COUNT(*) as count FROM loads WHERE customer_id = ?").get(customerId);
  if (hasLoads.count > 0) {
    return res.status(400).json({ message: "Cannot delete customer with existing loads" });
  }
  const result = db.prepare("DELETE FROM customers WHERE id = ?").run(customerId);
  if (result.changes === 0) return res.status(404).json({ message: "Customer not found" });
  return res.status(204).send();
});

app.get("/api/loads", (_req, res) => {
  const loads = db
    .prepare(
      `SELECT l.*, c.full_name as customer_name
       FROM loads l
       JOIN customers c ON c.id = l.customer_id
       ORDER BY l.id DESC`
    )
    .all();
  res.json(loads);
});

app.post("/api/loads", (req, res) => {
  const {
    customer_id,
    origin,
    destination,
    cargo_type,
    weight_kg,
    pickup_date,
    delivery_date,
    status,
    assigned_truck_id,
  } = req.body;

  if (
    !customer_id ||
    !origin ||
    !destination ||
    !cargo_type ||
    weight_kg === undefined ||
    !pickup_date ||
    !delivery_date ||
    !status
  ) {
    return res.status(400).json({ message: "All load fields except assigned_truck_id are required" });
  }

  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(customer_id);
  if (!customer) return res.status(400).json({ message: "Invalid customer_id" });

  const result = db
    .prepare(
      `INSERT INTO loads
       (customer_id, origin, destination, cargo_type, weight_kg, pickup_date, delivery_date, status, assigned_truck_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      customer_id,
      origin,
      destination,
      cargo_type,
      Number(weight_kg),
      pickup_date,
      delivery_date,
      status,
      assigned_truck_id || ""
    );

  const load = db.prepare("SELECT * FROM loads WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(load);
});

app.put("/api/loads/:id", (req, res) => {
  const loadId = Number(req.params.id);
  const {
    customer_id,
    origin,
    destination,
    cargo_type,
    weight_kg,
    pickup_date,
    delivery_date,
    status,
    assigned_truck_id,
  } = req.body;

  const result = db
    .prepare(
      `UPDATE loads
       SET customer_id = ?, origin = ?, destination = ?, cargo_type = ?, weight_kg = ?, pickup_date = ?,
           delivery_date = ?, status = ?, assigned_truck_id = ?
       WHERE id = ?`
    )
    .run(
      customer_id,
      origin,
      destination,
      cargo_type,
      Number(weight_kg),
      pickup_date,
      delivery_date,
      status,
      assigned_truck_id || "",
      loadId
    );

  if (result.changes === 0) return res.status(404).json({ message: "Load not found" });
  const load = db.prepare("SELECT * FROM loads WHERE id = ?").get(loadId);
  return res.json(load);
});

app.delete("/api/loads/:id", (req, res) => {
  const loadId = Number(req.params.id);
  const result = db.prepare("DELETE FROM loads WHERE id = ?").run(loadId);
  if (result.changes === 0) return res.status(404).json({ message: "Load not found" });
  return res.status(204).send();
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});


module.exports = app;