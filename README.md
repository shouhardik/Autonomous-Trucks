# Autonomous Trucks Dashboard

Full-stack web app with:
- Fleet data display for autonomous trucks
- Customer CRUD (personal/company details)
- Load CRUD linked to customers

## Run

```bash
npm install
npm start
```

Open `http://localhost:4000`.

## API

- `GET /api/trucks`
- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/loads`
- `POST /api/loads`
- `PUT /api/loads/:id`
- `DELETE /api/loads/:id`

Data is persisted in `backend/autonomous_trucks.db`.
