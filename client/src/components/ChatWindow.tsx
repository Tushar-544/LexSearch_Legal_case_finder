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
