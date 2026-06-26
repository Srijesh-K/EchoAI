import { ChatConversation } from "../types";

const STORAGE_KEY = "gemini_chat_conversations_v1";
const ACTIVE_ID_KEY = "gemini_chat_active_id_v1";

export function loadConversations(): ChatConversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load conversations from storage:", error);
    return [];
  }
}

export function saveConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save conversations to storage:", error);
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch {
    // ignore
  }
}

export function createNewConversation(
  personaId = "default",
  model = "echo-fast"
): ChatConversation {
  const now = Date.now();
  return {
    id: `conv_${now}_${Math.random().toString(36).substring(2, 9)}`,
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    personaId,
    model,
    useWebSearch: false,
    temperature: 0.7,
  };
}
