import React, { useRef, useState, useEffect } from "react";
import { ArrowUp, Square, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { MessagePart } from "../types";

interface ChatInputProps {
  onSend: (text: string, attachments?: MessagePart[]) => void;
  isGenerating: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isGenerating,
  onStop,
  disabled,
}) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MessagePart[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isGenerating || disabled) return;

    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments((prev) => [
          ...prev,
          {
            inlineData: {
              mimeType: file.type,
              data: base64,
            },
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md p-4 md:px-6">
      <div className="mx-auto max-w-4xl">
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((att, idx) =>
              att.inlineData ? (
                <div key={idx} className="relative group">
                  <img
                    src={`data:${att.inlineData.mimeType};base64,${att.inlineData.data}`}
                    alt="Attachment preview"
                    className="h-16 w-16 rounded-xl border border-zinc-700 object-cover"
                  />
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-800 p-0.5 text-zinc-400 hover:text-white border border-zinc-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 shadow-lg shadow-black/20 focus-within:border-indigo-500/50 transition">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="shrink-0 rounded-xl p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition disabled:opacity-40"
            title="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Echo AI..."
            rows={1}
            disabled={isGenerating || disabled}
            className="flex-1 resize-none bg-transparent py-2.5 px-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 max-h-[200px] custom-scrollbar"
          />

          {isGenerating ? (
            <button
              onClick={onStop}
              className="shrink-0 rounded-xl bg-zinc-700 p-2.5 text-white hover:bg-zinc-600 transition"
              title="Stop generating"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || disabled}
              className="shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/25"
              title="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[10px] text-zinc-600">
          Echo AI runs locally — no API keys needed
          {attachments.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5">
              • <ImageIcon className="h-2.5 w-2.5" /> images attached
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
