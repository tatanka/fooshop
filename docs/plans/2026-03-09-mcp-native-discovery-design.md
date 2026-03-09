# MCP Native Discovery — Design

## Goal

Make Fooshop products discoverable and purchasable by AI agents (Claude, ChatGPT, custom assistants) via MCP protocol. First marketplace natively MCP-compatible.

## Architecture

```
AI Agent ↔ MCP Server (stdio) ↔ Fooshop REST API ↔ PostgreSQL
```

MCP server is a separate npm package (`mcp-server/`), calls Fooshop's public REST API via `FOOSHOP_API_URL`. No direct DB access.

## API Endpoints

### Enhanced: `GET /api/products`

Add query params:
- `q` — ILIKE search on title + description
- `maxPrice` — filter by max price in cents
- `source` — tracking source (default "web"), records page_view

### New: `GET /api/products/[slug]`

Public endpoint. Returns product + creator info (store name, store slug). Records page_view with source param.

### New: `GET /api/stores/[slug]`

Public endpoint. Returns creator info + published products. Records page_view with source param.

### Enhanced: `POST /api/checkout`

Accept optional `source` field in body. Store in Stripe session metadata so webhook can propagate to order tracking.

## MCP Tools

| Tool | Description | API Call |
|------|-------------|----------|
| `search_products` | Search by query, category, maxPrice | `GET /api/products?q=...&source=mcp` |
| `get_product` | Get product details by slug | `GET /api/products/{slug}?source=mcp` |
| `get_store` | Get store and its products | `GET /api/stores/{slug}?source=mcp` |
| `get_checkout_url` | Get Stripe checkout URL for purchase | `POST /api/checkout` with source=mcp |

All tools return structured JSON with purchase URLs for agent to share with users.

## Analytics

- `page_views.source` already exists (default "web"), MCP tools pass `source=mcp`
- Checkout metadata includes source for future order attribution

## Documentation

`mcp-server/README.md` with:
- What tools are available
- `claude_desktop_config.json` example
- Environment variables
