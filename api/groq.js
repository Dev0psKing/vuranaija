let modelCache = null;
let modelCacheExpiresAt = 0;

async function resolveModel(apiKey, requestedModel) {
  const now = Date.now();
  if (!modelCache || now > modelCacheExpiresAt) {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return requestedModel;

    const data = await response.json();
    modelCache = new Set(
      (data?.data ?? [])
        .map((model) => model?.id)
        .filter((model) => typeof model === "string")
        .filter((model) => !/(whisper|guard|tts|translate|embedding)/i.test(model)),
    );
    modelCacheExpiresAt = now + 5 * 60 * 1000;
  }

  if (modelCache.has(requestedModel)) return requestedModel;

  if (requestedModel.includes("70b")) {
    for (const candidate of [
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ]) {
      if (modelCache.has(candidate)) return candidate;
    }
  } else {
    for (const candidate of [
      "llama-3.1-8b-instant",
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
    ]) {
      if (modelCache.has(candidate)) return candidate;
    }
  }

  return [...modelCache][0] ?? requestedModel;
}

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
  if (typeof model !== "string" || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid model or messages" });
  }

  const messageBytes = Buffer.byteLength(JSON.stringify(messages), "utf8");
  if (messageBytes > 100_000) {
    return res.status(413).json({ error: "Request is too large" });
  }

  let lastError = "Groq request failed";
  for (const apiKey of apiKeys) {
    const resolvedModel = await resolveModel(apiKey, model);
    if (!resolvedModel) continue;

    const body = {
      model: resolvedModel,
      messages,
      ...(response_format?.type === "json_object"
        ? { response_format: { type: "json_object" } }
        : {}),
    };

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
