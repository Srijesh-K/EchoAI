import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  Sparkles,
  Search,
  PanelLeftClose,
} from "lucide-react";
import { ChatConversation } from "../types";

interface SidebarProps {
  conversations: ChatConversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onClearAll,
  isOpen,
  onCloseMobile,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const startEditing = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveEditing = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const lastWeek = today - 86400000 * 7;

  const groups = {
    Today: filteredConversations.filter((c) => c.updatedAt >= today),
    Yesterday: filteredConversations.filter(
      (c) => c.updatedAt >= yesterday && c.updatedAt < today
    ),
    "Previous 7 Days": filteredConversations.filter(
      (c) => c.updatedAt >= lastWeek && c.updatedAt < yesterday
    ),
    Older: filteredConversations.filter((c) => c.updatedAt < lastWeek),
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-[#111111] p-4 space-y-6 text-zinc-300 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header Logo */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
              <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="font-semibold text-white tracking-tight text-base">Lumina AI</span>
          </div>

          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white md:hidden"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div>
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="flex items-center space-x-3 w-full bg-white/5 hover:bg-white/10 transition-colors py-2.5 px-4 rounded-xl border border-white/10 cursor-pointer group shadow-xs active:scale-[0.98]"
          >
            <span className="text-lg text-indigo-400 font-light group-hover:scale-110 transition-transform">+</span>
            <span className="text-sm font-medium text-white">New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="px-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-white/5 py-1.5 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 border border-white/5 focus:border-white/20 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
              <MessageSquare className="mb-2 h-7 w-7 stroke-[1.2] opacity-30" />
              <p className="text-xs font-medium">No conversations</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Start a new chat above</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No matching chats
            </div>
          ) : (
            Object.entries(groups).map(([groupName, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupName} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 block mb-1">
                    {groupName}
                  </label>
                  <div className="space-y-0.5">
                    {items.map((conv) => {
                      const isActive = conv.id === activeId;
                      const isEditing = editingId === conv.id;

                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            onCloseMobile();
                          }}
                          className={`group relative flex cursor-pointer items-center justify-between px-2.5 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-white/5 text-white font-medium border border-white/5"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-2 min-w-0 pr-10">
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
                              }`}
                            />

                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditing(conv.id, e);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                className="w-full rounded-md bg-[#1A1A1A] px-1.5 py-0.5 text-xs text-white border border-white/20 focus:outline-none"
                              />
                            ) : (
                              <span className="truncate text-xs md:text-sm">{conv.title}</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div
                            className={`absolute right-1.5 flex items-center gap-1 ${
                              isActive || isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            } transition-opacity bg-gradient-to-l from-[#111111] via-[#111111] to-transparent pl-3`}
                          >
                            {isEditing ? (
                              <>
                                <button
                                  onClick={(e) => saveEditing(conv.id, e)}
                                  className="rounded p-1 text-emerald-400 hover:bg-white/10"
                                  title="Save title"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(null);
                                  }}
                                  className="rounded p-1 text-zinc-400 hover:bg-white/10"
                                  title="Cancel"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => startEditing(conv.id, conv.title, e)}
                                  className="rounded p-1 text-zinc-500 hover:text-zinc-200"
                                  title="Rename chat"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => onDeleteConversation(conv.id, e)}
                                  className="rounded p-1 text-zinc-500 hover:text-rose-400"
                                  title="Delete chat"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer User Profile & Clear */}
        <div className="border-t border-white/5 pt-4 flex items-center justify-between px-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-medium text-zinc-300">
              U
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-300">User Session</span>
              <span className="text-[10px] text-zinc-500">Multimodal Active</span>
            </div>
          </div>

          {conversations.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Clear all chat history?")) {
                  onClearAll();
                }
              }}
              className="text-zinc-600 hover:text-rose-400 p-1 rounded-lg transition"
              title="Clear all chats"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

