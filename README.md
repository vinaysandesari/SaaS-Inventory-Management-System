# StockFlow — Inventory Management MVP

StockFlow is a multi-tenant inventory management application based on the supplied 6-hour MVP PRD.

## Technology
- Frontend: React 18, React Router, Vite, Lucide icons, responsive CSS
- Backend: Node.js, Express.js, REST API
- Database: MySQL 8+ with `mysql2`
- Authentication: JWT + bcrypt password hashing

## Included features
- Organization signup and email/password login
- One owner account per organization (staff/invitations are outside this MVP)
- Organization-scoped product data
- Product create, list, search by name/SKU, edit, and delete
- Product fields: name, SKU, description, quantity, cost price, selling price, optional low-stock threshold
- Dashboard with product count, total units, low-stock count, and low-stock list
- Organization-wide default low-stock threshold
- Responsive desktop/mobile layout
- Duplicate SKU validation within an organization

## Requirements
- Node.js 18 or newer
- MySQL 8 or newer
- MySQL Workbench (recommended for database setup)

## Setup

### 1. Create the database
1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database/schema.sql`.
3. Execute the complete script. It creates the `stockflow` database and the `organizations`, `users`, and `products` tables.

You can also run this first if you prefer to create the database separately:

```sql
CREATE DATABASE stockflow;
```

### 2. Configure and run the backend
Open a terminal in the project folder:

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` (on Windows PowerShell: `Copy-Item .env.example .env`). Edit `.env` and enter the MySQL credentials for your machine. Set a long, private `JWT_SECRET` value.

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stockflow
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```

Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Check the database connection at `http://localhost:5000/api/health` — a successful response is `{ "status": "ok", "database": "connected" }`.

### 3. Configure and run the React frontend
Open a **second terminal** in the project folder:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`).

## First-time demo
1. Choose **Create an account**.
2. Enter your email, a password of at least 8 characters, and an organization name.
3. Sign in; you will land on the dashboard.
4. Add products from the Products page. SKU must be unique within your organization.
5. Set the workspace default low-stock threshold in Settings.
6. Products at or below their own threshold (or the workspace default) are marked as low stock.

## API reference
All routes except signup, login, and health require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database health |
| POST | `/api/auth/signup` | Create organization and owner account |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/auth/me` | Current user and organization |
| GET | `/api/dashboard` | Inventory summary and low-stock items |
| GET | `/api/products?search=` | List/search organization products |
| GET | `/api/products/:id` | Get one organization product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/settings` | Get organization settings |
| PUT | `/api/settings` | Update default threshold |

Example product JSON:

```json
{
  "name": "Wireless Keyboard",
  "sku": "KEY-001",
  "description": "Compact wireless keyboard",
  "quantityOnHand": 12,
  "costPrice": 450,
  "sellingPrice": 699,
  "lowStockThreshold": 5
}
```

Use `null` or an empty value for optional prices/threshold. An empty product threshold uses the organization's default.

## Database relationships
- One organization can have one owner user in this MVP.
- Each user belongs to one organization.
- Each product belongs to one organization.
- `(organization_id, sku)` is unique, so different organizations may use the same SKU.
- Foreign keys cascade when an organization is deleted.

## Troubleshooting
- **Access denied for MySQL user:** check `DB_USER` and `DB_PASSWORD` in `backend/.env`.
- **Unknown database:** execute `database/schema.sql` in MySQL Workbench.
- **ECONNREFUSED on port 3306:** start the MySQL server and confirm `DB_PORT`.
- **Frontend cannot reach API:** keep the backend running on port 5000 and verify `CLIENT_URL` in `backend/.env`.
- **Port already in use:** change `PORT` in backend `.env` or stop the other process.

## MVP boundaries and production notes
This build intentionally excludes multi-warehouse inventory, variants, purchase orders, supplier management, integrations, billing, staff roles, audit history, and email notifications, matching the PRD scope. It uses hard delete, which the PRD allows for the MVP. Before production deployment, add HTTPS, rate limiting, robust schema validation, database migrations, automated tests, refresh-token/session management, backups, and deployment-specific secrets management.
