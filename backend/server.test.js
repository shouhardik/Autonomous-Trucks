const request = require("supertest");
const app = require("./app");

describe("API smoke tests", () => {
  const unique = Date.now();
  let customerId;

  test("GET /api/trucks returns 200 and array", async () => {
    const res = await request(app).get("/api/trucks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/customers returns 201 with valid payload", async () => {
    const res = await request(app).post("/api/customers").send({
      full_name: `Test User ${unique}`,
      email: `test${unique}@example.com`,
      phone: "1234567890",
      company_name: "Test Co",
      address: "123 Test St"
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    customerId = res.body.id;
  });

  test("POST /api/customers returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/customers").send({
      email: "missing-name@example.com",
      phone: "1234567890",
      address: "No Name St"
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/loads returns 400 for invalid customer_id", async () => {
    const res = await request(app).post("/api/loads").send({
      customer_id: 99999999,
      origin: "Phoenix, AZ",
      destination: "Dallas, TX",
      cargo_type: "Electronics",
      weight_kg: 1200,
      pickup_date: "2026-05-01",
      delivery_date: "2026-05-03",
      status: "Pending",
      assigned_truck_id: "AT-101"
    });

    expect(res.status).toBe(400);
  });

  test("GET /api/loads returns 200 and array", async () => {
    const res = await request(app).get("/api/loads");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /api/loads then GET /api/loads includes customer_name", async () => {
    const create = await request(app).post("/api/loads").send({
      customer_id: customerId,
      origin: "Phoenix, AZ",
      destination: "Dallas, TX",
      cargo_type: "Auto Parts",
      weight_kg: 800,
      pickup_date: "2026-05-05",
      delivery_date: "2026-05-07",
      status: "Scheduled",
      assigned_truck_id: "AT-102"
    });

    expect(create.status).toBe(201);

    const list = await request(app).get("/api/loads");
    expect(list.status).toBe(200);
    const inserted = list.body.find((x) => x.id === create.body.id);
    expect(inserted).toBeTruthy();
    expect(inserted).toHaveProperty("customer_name");
  });
});