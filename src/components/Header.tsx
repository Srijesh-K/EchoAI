import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Sparkles,
  ChevronDown,
  Globe,
  Plus,
  Check,
  Code2,
  Feather,
  Zap,
  GraduationCap,
} from "lucide-react";
import { ChatConversation } from "../types";
import { PERSONAS } from "../data/personas";
import { MODELS } from "../data/models";

interface HeaderProps {
  currentConversation: ChatConversation;
  onUpdateConversation: (updates: Partial<ChatConversation>) => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentConversation,
  onUpdateConversation,
  onToggleSidebar,
  onNewChat,
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);

  const modelRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (personaRef.current && !personaRef.current.contains(event.target as Node)) {
        setShowPersonaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModel =
    MODELS.find((m) => m.id === currentConversation.model) || MODELS[0];
  const activePersona =
    PERSONAS.find((p) => p.id === currentConversation.personaId) || PERSONAS[0];

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case "Code2":
        return <Code2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "Feather":
        return <Feather className="h-3.5 w-3.5 text-amber-400" />;
      case "Zap":
        return <Zap className="h-3.5 w-3.5 text-sky-400" />;
      case "GraduationCap":
        return <GraduationCap className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-indigo-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
          title="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Model Selector Pill (Exact Design Pattern) */}
        <div className="relative" ref={modelRef}>
          <div
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center space-x-1.5 cursor-pointer group px-3 py-1.5 text-xs font-medium bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition"
          >
            <span className="text-zinc-400">Model:</span>
            <span className="text-white font-semibold group-hover:text-indigo-300 transition-colors">
              {activeModel.name}
            </span>
            <span className="text-[10px] text-zinc-500 pl-1">▼</span>
          </div>

          {showModelDropdown && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-white/10 bg-[#141414] p-1.5 shadow-2xl shadow-black/90 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Select Model Architecture
              </div>
              <div className="space-y-1">
                {MODELS.map((model) => {
                  const isSelected = model.id === currentConversation.model;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onUpdateConversation({ model: model.id });
                        setShowModelDropdown(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${
                        isSelected
                          ? "bg-white/10 border border-white/10 text-white"
                          : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-indigo-400 stroke-[3]" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">{model.name}</span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                            {model.tag}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">
                          {model.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Persona Selector Pill */}
        <div className="relative" ref={personaRef}>
          <button
            onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            className="flex items-center space-x-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-white/10 hover:bg-white/10 transition cursor-pointer"
            title="Switch AI Persona"
          >
            {getPersonaIcon(activePersona.icon)}
            <span className="hidden sm:inline text-zinc-200">{activePersona.name}</span>
            <span className="text-[10px] text-zinc-500">▼</span>
          </button>

          {showPersonaDropdown && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-white/10 bg-[#141414] p-1.5 shadow-2xl shadow-black/90 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Select Persona / Instructions
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                {PERSONAS.map((persona) => {
                  const isSelected = persona.id === currentConversation.personaId;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        onUpdateConversation({ personaId: persona.id });
                        setShowPersonaDropdown(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${
                        isSelected
                          ? "bg-white/10 border border-white/10 text-white"
                          : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="mt-0.5 rounded-lg bg-white/5 p-1.5 shrink-0 border border-white/5">
                        {getPersonaIcon(persona.icon)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">{persona.name}</span>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                            {persona.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-2">
                          {persona.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2.5">
        {/* Web Search Grounding Button */}
        <button
          onClick={() =>
            onUpdateConversation({ useWebSearch: !currentConversation.useWebSearch })
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
            currentConversation.useWebSearch
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs shadow-emerald-500/10"
              : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-zinc-200"
          }`}
          title="Enable Google Search Grounding"
        >
          <Globe className={`h-3.5 w-3.5 ${currentConversation.useWebSearch ? "animate-spin [animation-duration:10s]" : ""}`} />
          <span className="hidden sm:inline">Search Grounding</span>
          <span className="sm:hidden">Web</span>
        </button>

        {/* Share Button (Exact Design Pattern) */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("App link copied to clipboard!");
          }}
          className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-200 rounded-lg border border-white/10 transition cursor-pointer hidden sm:inline-block"
        >
          Share
        </button>

        {/* Mobile New Chat */}
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg bg-white/10 text-white border border-white/10 hover:bg-white/20 transition sm:hidden"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

