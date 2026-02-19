/**
 * ChatWindow.tsx
 * ──────────────
 * Chat container with message list and input bar.
 * Manages auto-scroll and input submission.
 */

import { useRef, useEffect, useState } from "react";
import ChatMessage, { ChatMsg } from "./ChatMessage";

interface ChatWindowProps {
  messages: ChatMsg[];
  loading: boolean;
  onSend: (text: string) => void;
  onSuggestionClick: (text: string) => void;
  onSummarize: (text: string) => Promise<string>;
  currentQuery: string;
}

export default function ChatWindow({
  messages,
  loading,
  onSend,
  onSuggestionClick,
  onSummarize,
  currentQuery,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = () => {
    const q = input.trim();
    if (!q || loading) return;
    onSend(q);
    setInput("");
  };

  return (
    <div className="chat-window">
      {/* Messages */}
      <div className="chat-messages-list">
        {messages.length === 0 && !loading && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p>Start asking legal questions to begin your research session.</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onSuggestionClick={onSuggestionClick}
            onSummarize={onSummarize}
            queryText={currentQuery}
          />
        ))}

        {loading && (
          <div className="chat-message chat-ai">
            <div className="chat-avatar">⚖️</div>
            <div className="chat-bubble-wrapper">
              <div className="chat-bubble chat-typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">Analyzing legal database...</span>
