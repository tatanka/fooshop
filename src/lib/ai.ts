import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic();
  }
  return _anthropic;
}

interface GeneratedStore {
  storeName: string;
  storeDescription: string;
  suggestedProducts: {
    title: string;
    description: string;
    suggestedPriceCents: number;
    category: string;
    tags: string[];
  }[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: "sans" | "serif" | "mono";
    heroStyle: "gradient" | "solid" | "minimal";
    layout: "grid" | "featured" | "list";
  };
}

export async function generateStore(
  userDescription: string
): Promise<GeneratedStore> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are helping a creator set up their digital product store. Based on their description, generate a store configuration.

Creator says: "${userDescription}"

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "storeName": "catchy store name",
  "storeDescription": "compelling 1-2 sentence description",
  "suggestedProducts": [
    {
      "title": "product name",
      "description": "compelling product description (2-3 sentences)",
      "suggestedPriceCents": 1999,
      "category": "one of: templates, presets, luts, prompts, guides, courses, assets, other",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ],
  "theme": {
    "primaryColor": "#hex color that fits the brand",
    "secondaryColor": "#hex secondary color",
    "backgroundColor": "#hex background color",
    "textColor": "#hex text color",
    "accentColor": "#hex accent color",
    "fontFamily": "sans | serif | mono",
    "heroStyle": "gradient | solid | minimal",
    "layout": "grid | featured | list"
  }
}

Generate 2-4 suggested products based on what they sell. Price realistically for digital products.

Choose theme colors that form a cohesive palette. The backgroundColor should be a subtle tint (not pure white). Pick fontFamily, heroStyle, and layout that match the creator's niche.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as GeneratedStore;
}
