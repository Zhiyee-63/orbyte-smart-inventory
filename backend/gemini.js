const { GoogleGenAI } = require("@google/genai");

let client;

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

async function generateText(prompt) {
  const interaction = await getGeminiClient().interactions.create({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    input: prompt,
    store: false,
    generation_config: { max_output_tokens: 1024 },
  });

  return { text: interaction.output_text };
}

module.exports = { generateText };
