const { GoogleGenAI } = require("@google/genai");

let client;

const SUPPLIER_SYSTEM_INSTRUCTION = `
You are an AI assistant for a small business in Malaysia.

Your task is to draft a short, polite WhatsApp message asking a
supplier to replenish inventory.

Rules:
1. Use only the supplied business, product, supplier, and inventory data.
2. Use the exact product name and intended reorder quantity.
3. Never confuse current stock with the reorder quantity.
4. Use the supplied unit, such as boxes, cartons, or kilograms.
5. Use the supplier's preferred greeting when provided.
6. Follow the requested language. If no language is supplied, use English.
7. Never invent prices, delivery dates, or supplier promises.
8. Do not claim that an order has been placed or confirmed.
9. Return only the proposed WhatsApp message, with no explanation.
10. The message is a draft. Never claim that you sent it.
`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "GEMINI_API_KEY_MISSING";
    throw error;
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

async function generateSupplierMessage(data) {
  const interaction = await getGeminiClient().interactions.create({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",

    system_instruction: SUPPLIER_SYSTEM_INSTRUCTION,

    input: JSON.stringify(data),

    store: false,

    generation_config: {
      max_output_tokens: 300,
    },
  });

  const text = interaction.output_text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty message");
  }

  return { text };
}

module.exports = { generateSupplierMessage };
