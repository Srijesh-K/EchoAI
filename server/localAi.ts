export interface ChatPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface ChatTurn {
  role: "user" | "model";
  parts: ChatPart[];
}

export interface StreamChatOptions {
  messages: ChatTurn[];
  systemInstruction?: string;
  temperature?: number;
  useWebSearch?: boolean;
  model?: string;
}

export interface StreamChunk {
  text?: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri: string; title: string } }>;
  };
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

function extractText(parts: ChatPart[]): string {
  return parts.map((p) => p.text || "").filter(Boolean).join("\n");
}

function getLastUserMessage(messages: ChatTurn[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return extractText(messages[i].parts).trim();
    }
  }
  return "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* streamText(
  text: string,
  chunkSize = 3
): AsyncGenerator<StreamChunk> {
  const words = text.split(/(\s+)/);
  let buffer = "";

  for (const word of words) {
    buffer += word;
    if (buffer.length >= chunkSize || word.includes("\n")) {
      yield { text: buffer };
      buffer = "";
      await delay(12 + Math.random() * 18);
    }
  }

  if (buffer) {
    yield { text: buffer };
  }
}

async function tryOllamaStream(
  options: StreamChatOptions
): Promise<AsyncGenerator<StreamChunk> | null> {
  const ollamaMessages = options.messages
    .filter((m) => extractText(m.parts))
    .map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: extractText(m.parts),
    }));

  if (options.systemInstruction) {
    ollamaMessages.unshift({
      role: "system",
      content: options.systemInstruction,
    });
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
        },
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    async function* ollamaGenerator(): AsyncGenerator<StreamChunk> {
      let partial = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content;
            if (content) yield { text: content };
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }

    return ollamaGenerator();
  } catch {
    return null;
  }
}

async function searchWeb(query: string): Promise<{
  summary: string;
  sources: Array<{ uri: string; title: string }>;
  queries: string[];
}> {
  const sources: Array<{ uri: string; title: string }> = [];
  const queries = [query];

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    const parts: string[] = [];

    if (data.AbstractText) {
      parts.push(data.AbstractText);
      if (data.AbstractURL && data.AbstractSource) {
        sources.push({ uri: data.AbstractURL, title: data.AbstractSource });
      }
    }

    if (data.RelatedTopics?.length) {
      for (const topic of data.RelatedTopics.slice(0, 4)) {
        if (topic.Text && topic.FirstURL) {
          parts.push(`- ${topic.Text}`);
          sources.push({ uri: topic.FirstURL, title: topic.Text.slice(0, 60) });
        } else if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 2)) {
            if (sub.Text && sub.FirstURL) {
              parts.push(`- ${sub.Text}`);
              sources.push({ uri: sub.FirstURL, title: sub.Text.slice(0, 60) });
            }
          }
        }
      }
    }

    if (parts.length === 0) {
      const wikiQuery = query.replace(/\s+/g, "_");
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (wikiRes.ok) {
        const wiki = await wikiRes.json();
        if (wiki.extract) {
          parts.push(wiki.extract);
          if (wiki.content_urls?.desktop?.page) {
            sources.push({
              uri: wiki.content_urls.desktop.page,
              title: wiki.title || query,
            });
          }
        }
      }
    }

    return {
      summary: parts.join("\n\n"),
      sources: sources.slice(0, 6),
      queries,
    };
  } catch {
    return { summary: "", sources: [], queries };
  }
}

function safeMathEval(expression: string): string | null {
  const cleaned = expression
    .replace(/what is|calculate|compute|solve|evaluate|=/gi, "")
    .trim();

  if (!/^[\d\s+\-*/().^%]+$/.test(cleaned)) return null;

  try {
    const normalized = cleaned.replace(/\^/g, "**");
    const result = Function(`"use strict"; return (${normalized})`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      return String(Math.round(result * 1e10) / 1e10);
    }
  } catch {
    return null;
  }
  return null;
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hello|hey|good morning|good evening|good afternoon|howdy)\b/.test(lower)) {
    return "greeting";
  }
  if (/^(thanks|thank you|thx|appreciate)/.test(lower)) {
    return "thanks";
  }
  if (/^(bye|goodbye|see you|later)\b/.test(lower)) {
    return "farewell";
  }
  if (/^(who are you|what are you|your name)/.test(lower)) {
    return "identity";
  }
  if (/(write|create|generate|draft).*(code|function|script|program|hook|component)/i.test(message)) {
    return "code";
  }
  if (/(explain|what is|what are|how does|how do|tell me about|describe)/i.test(message)) {
    return "explain";
  }
  if (/(write|draft|compose|create).*(story|poem|email|essay|letter|blog)/i.test(message)) {
    return "creative";
  }
  if (/(list|give me|suggest|ideas|tips|steps|best practices)/i.test(message)) {
    return "list";
  }

  const mathResult = safeMathEval(message);
  if (mathResult) return "math";

  return "general";
}

function pickVariant<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % items.length;
  }
  return items[hash];
}

function buildCodeResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("react") && lower.includes("hook")) {
    return `Here's a reusable React debounce hook:

\`\`\`typescript
import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
\`\`\`

**Usage:**
\`\`\`tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebouncedValue(search, 400);

useEffect(() => {
  if (debouncedSearch) fetchResults(debouncedSearch);
}, [debouncedSearch]);
\`\`\`

This pattern avoids firing API calls on every keystroke. Adjust \`delay\` based on your UX needs.`;
  }

  if (lower.includes("python")) {
    return `Here's a Python script to parse JSON logs and summarize errors:

\`\`\`python
import json
from collections import Counter
from pathlib import Path

def summarize_errors(log_path: str) -> None:
    counts = Counter()
    with Path(log_path).open(encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            level = entry.get("level", "UNKNOWN")
            if level.upper() in {"ERROR", "CRITICAL"}:
                counts[entry.get("message", "Unknown error")] += 1

    for message, count in counts.most_common(10):
        print(f"{count:4d}  {message}")

if __name__ == "__main__":
    summarize_errors("app.log")
\`\`\`

Run it against your log file to see the top recurring errors.`;
  }

  return `I'd be happy to help with code. Based on your request, here's a starting point:

\`\`\`javascript
/**
 * ${message.slice(0, 80)}
 */
function solution(input) {
  // Step 1: Validate input
  if (input == null) throw new Error("Input is required");

  // Step 2: Process
  const result = input;

  // Step 3: Return
  return result;
}

module.exports = { solution };
\`\`\`

**Tips:**
1. Break the problem into smaller functions
2. Add error handling for edge cases
3. Write tests for the happy path and failure modes

Tell me the language and framework you prefer, and I can refine this further.`;
}

function buildExplainResponse(topic: string, webInfo?: string): string {
  const subject = topic
    .replace(/^(explain|what is|what are|how does|how do|tell me about|describe)\s+/i, "")
    .replace(/\?$/, "")
    .trim();

  if (webInfo) {
    return `## ${subject.charAt(0).toUpperCase() + subject.slice(1)}

${webInfo}

---

**Key takeaways:**
- This is a broad topic — ask follow-up questions for deeper detail
- I can break this down into simpler terms or compare it to related concepts
- Enable **Search Grounding** for the freshest information on current events`;
  }

  return `## ${subject.charAt(0).toUpperCase() + subject.slice(1)}

Here's a clear overview:

**Definition:** ${subject} is a concept worth understanding in context — it connects to practical problems and real-world applications.

**Why it matters:** Understanding ${subject} helps you make better decisions, communicate more clearly, and solve related problems faster.

**Core ideas:**
1. Start with the fundamentals before diving into advanced details
2. Look for examples that connect theory to practice
3. Compare ${subject} with similar concepts to spot differences

**Next steps:** Ask me to explain a specific aspect, give examples, or compare it to something you already know. I can also go deeper with step-by-step breakdowns.`;
}

function buildCreativeResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("email")) {
    return `Here's a professional email draft:

---

**Subject:** Request for Project Deadline Extension

Dear [Manager's Name],

I hope this message finds you well. I'm writing regarding the [Project Name] deliverable currently scheduled for [Original Date].

After reviewing the remaining scope — particularly [specific task/blocker] — I believe an extension of [X days/weeks] would allow us to maintain quality standards and address [risk/concern] without compromising the final outcome.

I've completed [progress summary] and have a clear plan for the remaining work. I'm happy to discuss priorities or adjust scope if a full extension isn't feasible.

Thank you for your consideration.

Best regards,
[Your Name]

---

Feel free to share the specific details and I'll tailor this further.`;
  }

  if (lower.includes("poem")) {
    return `**Whispers of Code**

In circuits soft and logic bright,
Ideas bloom from silent night.
Each function called, a story told,
In loops of silver, brave and bold.

The bugs may hide in shadowed lines,
But patience breaks their dark designs.
And when at last the tests all pass,
We raise a quiet toast — alas!

---

Want a different tone (funny, romantic, haiku)? Just say the word.`;
  }

  return `Here's a creative draft based on your prompt:

---

The morning light filtered through the window as she opened her laptop — today was the day everything would change. Not because of luck, but because of the small, deliberate choices she'd been making for months.

Sometimes the best stories start with a single question: *What if I tried?*

---

I can adjust the tone (formal, casual, humorous), length, or genre. What direction would you like?`;
}

function buildListResponse(message: string): string {
  return `Here are some thoughtful suggestions based on your request:

1. **Start with clarity** — Define exactly what you're trying to achieve before diving in
2. **Break it into steps** — Smaller milestones make progress visible and motivating
3. **Learn by doing** — Apply concepts immediately rather than over-studying theory
4. **Find a community** — Peers accelerate learning through feedback and shared experiences
5. **Review and iterate** — Regular reflection helps you improve faster than raw repetition

**Bonus tip:** Pick one item from this list and commit to it for the next 7 days. Consistency beats intensity.

Would you like me to expand on any of these points or tailor them to your specific situation?`;
}

function buildGreetingResponse(personaHint?: string): string {
  const greetings = [
    `Hello! I'm **Echo AI**, your local assistant — no API keys required. I run entirely on your machine${personaHint ? ` as your **${personaHint}**` : ""}.\n\nI can help with:\n- Explaining concepts\n- Writing and editing text\n- Code snippets and debugging tips\n- Brainstorming ideas\n- Math calculations\n\nWhat would you like to explore?`,
    `Hey there! Ready to chat. I'm running locally without any cloud API keys, so your conversations stay private.\n\nAsk me anything — explanations, code, creative writing, or problem-solving. How can I help?`,
  ];
  return pickVariant(greetings, personaHint || "default");
}

async function generateLocalResponse(
  options: StreamChatOptions
): Promise<{ text: string; grounding?: StreamChunk["groundingMetadata"] }> {
  const message = getLastUserMessage(options.messages);
  const intent = detectIntent(message);
  const persona = options.systemInstruction || "";
  const personaName = persona.match(/You are ([^,.\n]+)/)?.[1] || "Echo AI";

  let grounding: StreamChunk["groundingMetadata"] | undefined;
  let webSummary = "";

  if (options.useWebSearch && (intent === "explain" || intent === "general")) {
    const search = await searchWeb(message.replace(/\?/g, "").slice(0, 120));
    if (search.summary) {
      webSummary = search.summary;
      grounding = {
        webSearchQueries: search.queries,
        groundingChunks: search.sources.map((s) => ({ web: s })),
      };
    }
  }

  switch (intent) {
    case "greeting":
      return { text: buildGreetingResponse(personaName) };

    case "thanks":
      return {
        text: pickVariant(
          [
            "You're welcome! Feel free to ask if anything else comes to mind.",
            "Happy to help! Let me know if you'd like to explore this topic further.",
            "Anytime! I'm here whenever you need another hand.",
          ],
          message
        ),
      };

    case "farewell":
      return {
        text: pickVariant(
          [
            "Goodbye! Come back anytime you need help.",
            "See you later! Wishing you a productive day.",
            "Take care! I'll be here when you return.",
          ],
          message
        ),
      };

    case "identity":
      return {
        text: `I'm **Echo AI** — a ChatGPT-style assistant that runs **locally without API keys**.

**How I work:**
- Responses are generated on your machine
- If you have [Ollama](https://ollama.com) installed, I use it automatically for smarter replies
- With **Search Grounding** enabled, I fetch public web summaries (DuckDuckGo & Wikipedia)
- Your chat history is saved in your browser's local storage

${persona ? `\n**Current persona:** ${personaName}` : ""}

I'm not connected to Gemini or ChatGPT — I'm your private, self-hosted AI chat companion.`,
      };

    case "math": {
      const result = safeMathEval(message);
      return {
        text: result
          ? `The result is **${result}**.\n\nCalculation: \`${message.replace(/what is|calculate|compute|solve|evaluate|=/gi, "").trim()}\` = **${result}**`
          : "I couldn't evaluate that expression safely. Try something like `2 + 2` or `(15 * 8) / 3`.",
      };
    }

    case "code":
      return { text: buildCodeResponse(message) };

    case "explain":
      return { text: buildExplainResponse(message, webSummary || undefined), grounding };

    case "creative":
      return { text: buildCreativeResponse(message) };

    case "list":
      return { text: buildListResponse(message) };

    default: {
      if (webSummary) {
        return {
          text: `Based on what I found:\n\n${webSummary}\n\n---\n\nWould you like me to summarize this differently or go deeper on a specific part?`,
          grounding,
        };
      }

      const contextMessages = options.messages.slice(-6);
      const hasHistory = contextMessages.length > 2;

      return {
        text: hasHistory
          ? `That's an interesting point about "${message.slice(0, 100)}${message.length > 100 ? "..." : ""}".

Building on our conversation, here's my take:

${pickVariant(
  [
    "There are multiple angles to consider here. The most practical approach is to identify your core goal first, then work backward to find the simplest path forward.",
    "I'd suggest breaking this into two parts: understanding the 'why' behind your question, then exploring concrete next steps you can act on today.",
    "This connects to broader themes of problem-solving and learning. The key is to stay curious, test small assumptions, and iterate based on what you discover.",
  ],
  message
)}

**Want better answers?** Install [Ollama](https://ollama.com) and run \`ollama pull llama3.2\` — Echo AI will automatically use it for ChatGPT-quality responses, still with no API keys.`,
        : `Thanks for your message! Here's how I can help with "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}":

I can provide detailed explanations, write code, draft content, brainstorm ideas, or help you think through a problem step by step.

**Quick tips for better responses:**
- Be specific about what you need (format, length, language)
- Enable **Search Grounding** for factual or current-event questions
- Install **Ollama** locally for AI-powered responses without any API keys

What aspect would you like me to focus on?`,
      };
    }
  }
}

export async function* streamChatResponse(
  options: StreamChatOptions
): AsyncGenerator<StreamChunk> {
  const ollamaStream = await tryOllamaStream(options);

  if (ollamaStream) {
    for await (const chunk of ollamaStream) {
      yield chunk;
    }
    return;
  }

  const { text, grounding } = await generateLocalResponse(options);

  for await (const chunk of streamText(text)) {
    if (grounding && !chunk.groundingMetadata) {
      yield { ...chunk, groundingMetadata: grounding };
    } else {
      yield chunk;
    }
  }
}
