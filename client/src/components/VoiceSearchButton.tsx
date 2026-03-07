/**
 * VoiceSearchButton.tsx
 * ─────────────────────
 * Uses the Web Speech API to convert speech to text for search input.
 */

import { useState, useCallback } from "react";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
}

export default function VoiceSearchButton({ onResult }: VoiceSearchButtonProps) {
  const [listening, setListening] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const handleVoice = useCallback(() => {
    if (!supported || listening) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }, [supported, listening, onResult]);

  if (!supported) return null;

  return (
    <button
      className={`voice-btn ${listening ? "voice-active" : ""}`}
      onClick={handleVoice}
      title={listening ? "Listening..." : "Voice search"}
    >
      {listening ? "🔴" : "🎙️"}
    </button>
  );
}
