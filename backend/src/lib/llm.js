import "dotenv/config";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-3.6-flash"; // free-tier friendly, stable

// For plain text answers (e.g. the recommendations chatbot)
export async function askGemini({ system, prompt, maxTokens = 1000 }) {
  const res = await fetch(`${GEMINI_API_URL}/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

// For structured JSON — uses Gemini's native responseSchema instead of prompting
// the model to "output only JSON" and hoping. More reliable, no fence-stripping needed.
export async function askGeminiJson({ system, prompt, schema, maxTokens = 2000 }) {
  const res = await fetch(`${GEMINI_API_URL}/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: "minimal" }, // skip reasoning tokens, leaves full budget for the JSON itself
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const finishReason = data.candidates?.[0]?.finishReason;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";

  if (finishReason === "MAX_TOKENS") {
    throw new Error("Response was cut off — try a shorter/simpler request, or this needs a higher token limit");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Model returned malformed JSON");
  }
}