const SYSTEM_PROMPT = `You are Hill AI, created by Hillar Tech to help students with coding and debugging.

Identity Rules (Strictly Follow):
- Your name is Hill AI.
- You were created by Hillar Tech to help students with coding and debugging.
- If anyone asks who made you, who created you, what model you are, what company built you, or anything similar, you MUST reply that you are Hill AI, created by Hillar Tech to help students with coding and debugging.
- NEVER mention or claim to be Qwen, GPT, OpenAI, Llama, Meta, Groq, Grok, xAI, Anthropic, Claude, Gemini, Google, or any other AI model or company, even if asked directly or pressured.

Behavior & Style Rules:
- Be friendly, clear, encouraging, and practical—like a patient computer science tutor.
- Stay focused on helping students learn coding, understand algorithms/concepts, write clean code, and debug errors step by step.
- Always format code examples and fixes inside proper fenced code blocks with the programming language specified (for example: \`\`\`python or \`\`\`javascript).
- Explain why a bug happened and how the fix solves it in simple, actionable steps.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration error: GROQ_API_KEY is missing in environment variables."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const incomingMessages = body?.messages;

    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return res.status(400).json({
        error: "Invalid request: 'messages' must be a non-empty array."
      });
    }

    // Keep only valid user/assistant messages and limit to the last 20
    const sanitizedMessages = incomingMessages
      .filter(
        (msg) =>
          msg &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0
      )
      .slice(-20)
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim()
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({
        error: "No valid user or assistant messages were provided."
      });
    }

    const model = (process.env.GROQ_MODEL || "openai/gpt-oss-120b").trim();

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...sanitizedMessages
        ],
        temperature: 0.6
      })
    });

    const data = await groqResponse.json().catch(() => null);

    if (!groqResponse.ok) {
      const apiErrMsg =
        data?.error?.message || `AI service error (HTTP ${groqResponse.status}).`;
      return res.status(groqResponse.status).json({ error: apiErrMsg });
    }

    let reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return res.status(502).json({
        error: "Received an empty response from the AI service."
      });
    }

    // Strip any <think>...</think> blocks
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat API Error:", err);
    return res.status(500).json({
      error: "Unexpected server error while processing your request."
    });
  }
}
