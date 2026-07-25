"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  createSpeechRecognition,
  hasFinalResult,
  speechErrorMessage,
  transcriptFromResults,
  type BrowserSpeechRecognition,
} from "@/lib/speech";

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  label?: string;
  listeningLabel?: string;
  example?: string;
  helperText?: string;
}

type VoiceStatus = "idle" | "listening" | "processing";

export default function VoiceInput({
  onTranscript,
  label = "Say the violation code",
  listeningLabel = "Listening… say the violation code",
  example = "Example: “A.C. 16-118 2 A”",
  helperText = "Your browser may ask for microphone permission. Text input remains available.",
}: VoiceInputProps) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const deliveredRef = useRef(false);
  const hadErrorRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const statusId = useId();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function deliverTranscript() {
    const transcript = transcriptRef.current.trim();

    if (!transcript || deliveredRef.current || hadErrorRef.current) {
      return;
    }

    deliveredRef.current = true;
    onTranscriptRef.current(transcript);
  }

  function startListening() {
    const recognition = createSpeechRecognition();

    if (!recognition) {
      setError(
        "Voice input isn’t supported in this browser. Use Chrome, or type the code instead.",
      );
      return;
    }

    transcriptRef.current = "";
    deliveredRef.current = false;
    hadErrorRef.current = false;
    setPreview("");
    setError("");
    setStatus("processing");

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      const transcript = transcriptFromResults(event.results);
      transcriptRef.current = transcript;
      setPreview(transcript);

      if (hasFinalResult(event.results)) {
        deliverTranscript();
      }
    };

    recognition.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      hadErrorRef.current = Boolean(message);
      setError(message);
      setStatus("idle");
    };

    recognition.onend = () => {
      deliverTranscript();
      recognitionRef.current = null;
      setStatus("idle");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus("idle");
      setError(
        "The microphone is already in use. Wait a moment and try again, or type the code instead.",
      );
    }
  }

  function stopListening() {
    setStatus("processing");
    recognitionRef.current?.stop();
  }

  const isActive = status !== "idle";
  const statusLabel =
    status === "listening"
      ? listeningLabel
      : status === "processing"
        ? "Starting microphone…"
        : label;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={isActive ? stopListening : startListening}
        aria-pressed={isActive}
        aria-describedby={statusId}
        className={[
          "group flex min-h-14 w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left",
          "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400",
          isActive
            ? "border-amber-400 bg-amber-400/10 text-amber-100"
            : "border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={[
              "relative grid size-9 shrink-0 place-items-center rounded-full",
              isActive
                ? "bg-amber-400 text-zinc-950"
                : "bg-zinc-800 text-zinc-300 group-hover:text-white",
            ].join(" ")}
            aria-hidden="true"
          >
            {status === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />
            )}
            <svg
              viewBox="0 0 24 24"
              className="relative size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{statusLabel}</span>
            <span className="block truncate text-xs text-zinc-500">
              {preview || example}
            </span>
          </span>
        </span>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {isActive ? "Tap to stop" : "Chrome"}
        </span>
      </button>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={[
          "mt-2 min-h-5 text-xs",
          error ? "text-red-400" : "text-zinc-500",
        ].join(" ")}
      >
        {error ||
          (preview
            ? `Heard: “${preview}”`
            : helperText)}
      </p>
    </div>
  );
}
