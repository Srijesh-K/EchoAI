import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { streamChatResponse } from "./server/localAi";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      mode: "local",
      apiKeyRequired: false,
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model, systemInstruction, useWebSearch, temperature } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      let sentGrounding = false;

      for await (const chunk of streamChatResponse({
        messages: messages || [],
        model,
        systemInstruction,
        useWebSearch: Boolean(useWebSearch),
        temperature: typeof temperature === "number" ? temperature : 0.7,
      })) {
        const payload: Record<string, unknown> = { text: chunk.text || "" };
        if (chunk.groundingMetadata && !sentGrounding) {
          payload.groundingMetadata = chunk.groundingMetadata;
          sentGrounding = true;
        }
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: unknown) {
      console.error("Chat API error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Echo AI running at http://localhost:${PORT}`);
    console.log("No API keys required — local AI mode active");
  });
}

startServer();
