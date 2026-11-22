const ALLOWED_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_ALT,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    return res.status(503).json({ error: "AI service is not configured" });
  }

  const { model, messages, response_format } = req.body ?? {};
  if (!ALLOWED_MODELS.has(model) || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid model or messages" });
  }

  const messageBytes = Buffer.byteLength(JSON.stringify(messages), "utf8");
  if (messageBytes > 100_000) {
    return res.status(413).json({ error: "Request is too large" });
  }

  const body = {
    model,
    messages,
    ...(response_format?.type === "json_object"
      ? { response_format: { type: "json_object" } }
      : {}),
  };

  let lastError = "Groq request failed";
  for (const apiKey of apiKeys) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError = `Groq API error: ${response.status}`;
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        lastError = "Groq returned an invalid response";
        continue;
      }

      return res.status(200).json({ content });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Groq request failed";
    } finally {
      clearTimeout(timeout);
    }
  }

  return res.status(502).json({ error: lastError });
}
