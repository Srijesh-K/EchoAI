/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ChatArea } from "./components/ChatArea";
import { ChatInput } from "./components/ChatInput";
import { PERSONAS } from "./data/personas";
import {
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  createNewConversation,
} from "./lib/storage";
import { ChatConversation, ChatMessage, MessagePart, GroundingMetadata } from "./types";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}...` : cleaned;
}

function formatMessagesForApi(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    parts: m.parts,
  }));
}

function getInitialState(): { conversations: ChatConversation[]; activeId: string } {
  const loaded = loadConversations();
  if (loaded.length > 0) {
    const saved = loadActiveConversationId();
    const activeId =
      saved && loaded.some((c) => c.id === saved) ? saved : loaded[0].id;
    return { conversations: loaded, activeId };
  }
  const initial = createNewConversation();
  return { conversations: [initial], activeId: initial.id };
}

export default function App() {
  const initial = getInitialState();
  const [conversations, setConversations] = useState<ChatConversation[]>(
    initial.conversations
  );
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const currentConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveConversationId(activeId);
  }, [activeId]);

  const updateConversation = useCallback(
    (id: string, updater: (conv: ChatConversation) => ChatConversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? updater(c) : c))
      );
    },
    []
  );

  const ensureActiveConversation = useCallback((): ChatConversation => {
    if (activeId && conversations.some((c) => c.id === activeId)) {
      return conversations.find((c) => c.id === activeId)!;
    }
    const newConv = createNewConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv;
  }, [activeId, conversations]);

  const handleNewChat = () => {
    const newConv = createNewConversation(
      currentConversation.personaId,
      currentConversation.model
    );
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  };

  const sendMessage = async (text: string, attachments?: MessagePart[]) => {
    const conv = ensureActiveConversation();
    const persona =
      PERSONAS.find((p) => p.id === conv.personaId) || PERSONAS[0];

    const userParts: MessagePart[] = [];
    if (text) userParts.push({ text });
    if (attachments) userParts.push(...attachments);

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      parts: userParts,
      timestamp: Date.now(),
    };

    const messagesWithUser = [...conv.messages, userMessage];
    const isFirstMessage = conv.messages.length === 0;

    updateConversation(conv.id, (c) => ({
      ...c,
      messages: messagesWithUser,
      updatedAt: Date.now(),
      title: isFirstMessage ? generateTitle(text) : c.title,
    }));

    setIsGenerating(true);
    abortRef.current = new AbortController();

    const aiMessageId = generateId();
    let accumulatedText = "";
    let groundingMetadata: GroundingMetadata | undefined;

    updateConversation(conv.id, (c) => ({
      ...c,
      messages: [
        ...messagesWithUser,
        {
          id: aiMessageId,
          role: "model",
          parts: [{ text: "" }],
          timestamp: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formatMessagesForApi(messagesWithUser),
          model: conv.model,
          systemInstruction: persona.systemPrompt,
          useWebSearch: conv.useWebSearch,
          temperature: conv.temperature,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulatedText += parsed.text;
            }
            if (parsed.groundingMetadata) {
              groundingMetadata = parsed.groundingMetadata;
            }

            const currentText = accumulatedText;
            updateConversation(conv.id, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === aiMessageId
                  ? {
                      ...m,
                      parts: [{ text: currentText }],
                      groundingMetadata: groundingMetadata || m.groundingMetadata,
                    }
                  : m
              ),
              updatedAt: Date.now(),
            }));
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              if (parseErr.message.includes("error") || !parseErr.message.includes("JSON")) {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;

      const errorText =
        error instanceof Error ? error.message : "Failed to generate response.";

      updateConversation(conv.id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                parts: [{ text: errorText }],
                isError: true,
              }
            : m
        ),
        updatedAt: Date.now(),
      }));
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const handleRegenerate = () => {
    const conv = currentConversation;
    const lastUserIdx = [...conv.messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;

    const actualIdx = conv.messages.length - 1 - lastUserIdx;
    const lastUser = conv.messages[actualIdx];
    const userText = lastUser.parts.map((p) => p.text || "").join("\n");

    updateConversation(conv.id, (c) => ({
      ...c,
      messages: c.messages.slice(0, actualIdx),
      updatedAt: Date.now(),
    }));

    setTimeout(() => {
      sendMessage(userText, lastUser.parts.filter((p) => p.inlineData));
    }, 50);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0A] text-zinc-100 font-sans antialiased">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onNewChat={handleNewChat}
        onDeleteConversation={(id, e) => {
          e.stopPropagation();
          setConversations((prev) => {
            const next = prev.filter((c) => c.id !== id);
            if (next.length === 0) {
              const fresh = createNewConversation();
              setActiveId(fresh.id);
              return [fresh];
            }
            if (activeId === id) {
              setActiveId(next[0].id);
            }
            return next;
          });
        }}
        onRenameConversation={(id, newTitle) => {
          updateConversation(id, (c) => ({ ...c, title: newTitle, updatedAt: Date.now() }));
        }}
        onClearAll={() => {
          const fresh = createNewConversation();
          setConversations([fresh]);
          setActiveId(fresh.id);
        }}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          currentConversation={currentConversation}
          onUpdateConversation={(updates) => {
            updateConversation(currentConversation.id, (c) => ({
              ...c,
              ...updates,
              updatedAt: Date.now(),
            }));
          }}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onNewChat={handleNewChat}
        />

        <ChatArea
          conversation={currentConversation}
          isGenerating={isGenerating}
          onSendPrompt={sendMessage}
          onRegenerate={handleRegenerate}
        />

        <ChatInput
          onSend={sendMessage}
          isGenerating={isGenerating}
          onStop={handleStop}
        />
      </div>
    </div>
  );
}
