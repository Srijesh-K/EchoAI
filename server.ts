import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model, systemInstruction, useWebSearch, temperature } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ error: "GEMINI_API_KEY is not configured in environment secrets." })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const targetModel = model || "gemini-3.5-flash";

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents: messages,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: typeof temperature === "number" ? temperature : 0.7,
          tools: useWebSearch ? [{ googleSearch: {} }] : undefined,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        let groundingMetadata = undefined;
        const candidate = chunk.candidates?.[0];
        if (candidate?.groundingMetadata) {
          groundingMetadata = candidate.groundingMetadata;
        }

        res.write(`data: ${JSON.stringify({ text, groundingMetadata })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Chat API error:", error);
      const errorMessage = error?.message || "An unexpected error occurred while communicating with Gemini.";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Vite middleware for development or Static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
