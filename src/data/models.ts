import { ModelOption } from "../types";

export const MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tag: "Recommended",
    description: "Fast, intelligent, and multimodal model ideal for everyday chats and complex tasks."
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    tag: "High Speed",
    description: "Lightweight model optimized for low latency and ultra-fast responses."
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    tag: "Deep Reasoning",
    description: "Advanced reasoning and STEM capability for intricate coding and analysis."
  }
];
