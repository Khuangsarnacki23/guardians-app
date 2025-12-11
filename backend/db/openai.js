// db/openai.js
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedText(text, { retries = 2, delayMs = 300 } = {}) {
  console.log("[embedText] starting, length:", text.length);

  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small", 
      input: text,
    });

    const embedding = res.data[0].embedding;
    console.log(
      "[embedText] done. dim=",
      embedding.length,
      "first3=",
      embedding.slice(0, 3)
    );

    return embedding;
  } catch (err) {
    const status = err.status || err.code || err?.response?.status;
    console.error("[embedText] error:", status, err?.message || err);

    if (status === 429 && retries > 0) {
      console.warn(
        `[embedText] rate-limited. retrying in ${delayMs}ms… (retries left: ${retries})`
      );
      await sleep(delayMs);
      return embedText(text, {
        retries: retries - 1,
        delayMs: delayMs * 2,
      });
    }

    throw err;
  }
}

async function chatWithContext({ question, profileSummary, contextChunks }) {
  const contextText = contextChunks
    .map((c, idx) => `Context #${idx + 1}:\n${c}`)
    .join("\n\n");

  const systemPrompt = `
You are a pitching and strength training assistant for a baseball player.

You have:
- A player profile (level, role, handedness, schedule, priorities, injuries)
- A list of their past sessions and goals, summarized in natural language.

Use ONLY the provided context plus general training knowledge.
If you refer to numbers (like velocity, accuracy, weights), prefer the ones from the context.
Answers should be specific, practical, and oriented toward this player's actual situation.
`;

  const userPrompt = `
Player profile:
${profileSummary || "No profile on file."}

Training history & goals:
${contextText || "No sessions or goals available."}

Player's question:
"${question}"

You are a coaching AI assistant intended to provide mental and physical support in the best interest of the player given the players history, profile and goals. 
Give a conversation-like response relevant to the question provided.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userPrompt.trim() },
    ],
    temperature: 0.4,
  });

  return completion.choices[0].message.content;
}

module.exports = { embedText, chatWithContext };
