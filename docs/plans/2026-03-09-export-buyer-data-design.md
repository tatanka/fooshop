# Export Buyer Data (CSV + API) — Design

Issue: #9

## API Endpoint

`GET /api/orders/export?format=csv` — authenticated, returns all orders for the logged-in creator as CSV download.

- Auth: `session.user.id` → creator lookup
- Query: join `orders` with `products` to get `product.title`
- CSV columns: `order_id`, `buyer_email`, `buyer_name`, `product_title`, `amount`, `platform_fee`, `net_revenue`, `currency`, `status`, `date`
- Amounts as decimals (e.g. `9.99`)
- Date as ISO 8601
- Headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="orders-YYYY-MM-DD.csv"`
- No pagination — all orders returned
- Ordered by `created_at DESC`
- All order statuses included (pending, completed, refunded)

## Dashboard Orders Page

`/dashboard/orders` — server component with full orders table and export button.

- Table columns: buyer email, product title, amount, status, date
- "Export CSV" button: `<a href="/api/orders/export?format=csv">` (native browser download)
- Link from main dashboard "Recent Orders" → "View all orders"

## Out of Scope

- Date range filters
- Pagination
- JSON export format
- Streaming/chunked response
