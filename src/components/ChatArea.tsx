import React, { useRef, useEffect } from "react";
import { Sparkles, Bot, Zap, ArrowUpRight } from "lucide-react";
import { ChatConversation } from "../types";
import { PERSONAS } from "../data/personas";
import { MessageBubble } from "./MessageBubble";

interface ChatAreaProps {
  conversation: ChatConversation;
  isGenerating: boolean;
  onSendPrompt: (text: string) => void;
  onRegenerate: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  isGenerating,
  onSendPrompt,
  onRegenerate,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activePersona =
    PERSONAS.find((p) => p.id === conversation.personaId) || PERSONAS[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isGenerating]);

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
      {conversation.messages.length === 0 ? (
        /* Welcome Hero Screen */
        <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-12 text-center max-w-3xl mx-auto my-auto animate-in fade-in duration-300">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-600/25 ring-8 ring-indigo-500/10">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>

          <h1 className="font-sans text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-100">
            What can I help with today?
          </h1>

          <div className="mt-3 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-1.5 border border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold text-indigo-400">Persona:</span>
            <span>{activePersona.name}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300">{activePersona.badge}</span>
          </div>

          <p className="mt-4 text-xs md:text-sm text-zinc-400 max-w-xl leading-relaxed">
            {activePersona.description}
          </p>

          {/* Suggestions Grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
            {activePersona.promptSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSendPrompt(suggestion)}
                className="group flex flex-col justify-between rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/80 hover:bg-zinc-800/80 hover:border-indigo-500/50 transition duration-200 cursor-pointer shadow-xs"
              >
                <p className="text-xs md:text-sm font-medium text-zinc-300 group-hover:text-zinc-100 leading-snug">
                  "{suggestion}"
                </p>
                <div className="mt-3 flex items-center justify-end">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Message Stream List */
        <div className="flex flex-col pb-6">
          {conversation.messages.map((msg, idx) => {
            const isLast = idx === conversation.messages.length - 1;
            const isLastAi = isLast && msg.role === "model";
            return (
              <MessageBubble
                key={msg.id || idx}
                message={msg}
                onRegenerate={onRegenerate}
                isLastAiMessage={isLastAi}
              />
            );
          })}

          {/* Typing Indicator while generating */}
          {isGenerating && (
            <div className="flex w-full py-6 px-4 md:px-6 bg-zinc-900/40 border-y border-zinc-800/40 justify-start animate-in fade-in duration-200">
              <div className="flex w-full max-w-4xl gap-4 flex-row">
                <div className="shrink-0 pt-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-600/30">
                    <Sparkles className="h-4 w-4 animate-spin" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="ml-2 text-xs font-mono text-zinc-400">Echo AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
    </main>
  );
};
