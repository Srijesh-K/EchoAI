import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  User,
  Copy,
  Check,
  RefreshCw,
  Volume2,
  VolumeX,
  Globe,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLastAiMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRegenerate,
  isLastAiMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === "user";

  // Combine text from all parts
  const fullText = message.parts
    .map((p) => p.text || "")
    .filter(Boolean)
    .join("\n\n");

  const inlineImages = message.parts
    .map((p) => p.inlineData)
    .filter(Boolean);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeechToggle = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const groundingChunks = message.groundingMetadata?.groundingChunks || [];
  const searchQueries = message.groundingMetadata?.webSearchQueries || [];

  return (
    <div
      className={`flex w-full py-6 px-4 md:px-6 transition ${
        isUser ? "bg-zinc-950/40 justify-end" : "bg-zinc-900/40 border-y border-zinc-800/40 justify-start"
      }`}
    >
      <div
        className={`flex w-full max-w-4xl gap-4 ${
          isUser ? "flex-row-reverse sm:ml-auto max-w-2xl" : "flex-row"
        }`}
      >
        {/* Avatar Icon */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 shadow-xs">
              <User className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Message Content Body */}
        <div className={`flex flex-col flex-1 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          {/* Attached Inline Images */}
          {inlineImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {inlineImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-xl border border-zinc-700/80 shadow-md max-h-60 max-w-xs"
                >
                  <img
                    src={`data:${img!.mimeType};base64,${img!.data}`}
                    alt="Attached input"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Text Bubble / Markdown */}
          {message.isError ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{fullText || "An error occurred while generating this response."}</span>
            </div>
          ) : isUser ? (
            <div className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm text-white shadow-md leading-relaxed whitespace-pre-wrap word-break">
              {fullText}
            </div>
          ) : (
            <div className="w-full text-zinc-200 text-sm leading-relaxed word-break">
              <div className="markdown-body space-y-3">
                <Markdown
                  components={{
                    pre: ({ children }) => (
                      <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs text-zinc-300 my-3">
                        {children}
                      </pre>
                    ),
                    code: ({ node, className, children, ...props }) => {
                      const isInline = !className?.includes("language-");
                      if (isInline) {
                        return (
                          <code className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-indigo-300 font-medium">
                            {children}
                          </code>
                        );
                      }
                      return <code {...props}>{children}</code>;
                    },
                    p: ({ children }) => <p className="leading-7 my-1">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-1.5 my-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1.5 my-2">{children}</ol>,
                    li: ({ children }) => <li className="pl-1">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-bold font-sans text-zinc-100 my-4 pb-2 border-b border-zinc-800">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold font-sans text-zinc-100 mt-4 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold font-sans text-zinc-100 mt-3 mb-1">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500/80 pl-4 italic text-zinc-400 my-3">{children}</blockquote>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium">
                        {children}
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    ),
                  }}
                >
                  {fullText}
                </Markdown>
              </div>

              {/* Web Search Grounding Citations */}
              {(groundingChunks.length > 0 || searchQueries.length > 0) && (
                <div className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Globe className="h-3.5 w-3.5" />
                    <span>Sources & Search Grounding</span>
                  </div>

                  {searchQueries.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-zinc-500 font-medium">Searched:</span>
                      {searchQueries.map((q, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 border border-zinc-800"
                        >
                          🔍 "{q}"
                        </span>
                      ))}
                    </div>
                  )}

                  {groundingChunks.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {groundingChunks.map((chunk, idx) => {
                        if (!chunk.web?.uri) return null;
                        return (
                          <a
                            key={idx}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between rounded-lg bg-zinc-900/90 p-2 text-xs border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition"
                          >
                            <span className="truncate pr-2 font-medium text-zinc-300 group-hover:text-indigo-400">
                              {chunk.web.title || chunk.web.uri}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-zinc-500 group-hover:text-indigo-400" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="mt-3 flex items-center gap-2 pt-1 text-zinc-400">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs hover:bg-zinc-800 hover:text-zinc-200 transition"
                  title="Copy text"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>

                {onRegenerate && isLastAiMessage && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs hover:bg-zinc-800 hover:text-zinc-200 transition"
                    title="Regenerate response"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Regenerate</span>
                  </button>
                )}

                <button
                  onClick={handleSpeechToggle}
                  className={`flex items-center gap-1.5 rounded-lg p-1.5 text-xs transition ${
                    isSpeaking
                      ? "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
                      : "hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                  title={isSpeaking ? "Stop speaking" : "Read response aloud"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                      <span className="text-[11px]">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Speak</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
