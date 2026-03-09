# @fooshop/mcp-server

MCP server for [Fooshop](https://fooshop.ai) — discover and purchase digital products from AI agents.

## Tools

| Tool | Description |
|------|-------------|
| `search_products` | Search products by query, category, and max price |
| `get_product` | Get detailed product info by slug |
| `get_store` | Get a creator's store and all their products |
| `get_checkout_url` | Get a Stripe checkout URL to purchase a product |

## Setup

### Build

```bash
cd mcp-server
pnpm install
pnpm build
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fooshop": {
      "command": "node",
      "args": ["/path/to/fooshop/mcp-server/dist/index.js"],
      "env": {
        "FOOSHOP_API_URL": "https://fooshop.ai"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "fooshop": {
      "command": "node",
      "args": ["/path/to/fooshop/mcp-server/dist/index.js"],
      "env": {
        "FOOSHOP_API_URL": "https://fooshop.ai"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FOOSHOP_API_URL` | `https://fooshop.ai` | Fooshop API base URL |

## Example Usage

Once connected, an AI agent can:

1. **Search:** "Find Notion templates for project management under $20"
2. **Browse:** "Show me all products from store X"
3. **Details:** "Tell me more about this product"
4. **Purchase:** "I want to buy this — give me the checkout link"
