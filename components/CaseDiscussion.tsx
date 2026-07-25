"use client";

import { FormEvent, useRef, useState } from "react";

import VoiceInput from "@/components/VoiceInput";
import { cancelSpeech, speakText } from "@/lib/speech";
import type {
  Analysis,
  CaseDiscussionMessage,
  CaseDiscussionResponse,
} from "@/lib/types";

interface CaseDiscussionProps {
  analysis: Analysis;
}

const WELCOME_MESSAGE =
  "Ask what the statistics mean, what evidence may be useful, or how facts you provide could affect your defense. I’ll reason from this report and clearly separate public data from your specific situation.";

export default function CaseDiscussion({ analysis }: CaseDiscussionProps) {
  const [messages, setMessages] = useState<CaseDiscussionMessage[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  async function askQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion || isThinking) {
      return;
    }

    const priorMessages = messages.slice(1);
    const userMessage: CaseDiscussionMessage = {
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setIsThinking(true);
    cancelSpeech();
    setIsSpeaking(false);

    try {
      const response = await fetch("/api/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          messages: priorMessages,
          question: trimmedQuestion,
        }),
      });
      const data = (await response.json()) as
        | CaseDiscussionResponse
        | { error?: string };

      if (!response.ok || !("answer" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Could not continue the discussion.",
        );
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
      requestAnimationFrame(() => {
        conversationEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not continue the discussion.",
      );
    } finally {
      setIsThinking(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(question);
  }

  function readLatestAnswer() {
    const latestAnswer = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!latestAnswer) {
      return;
    }

    if (isSpeaking) {
      cancelSpeech();
      setIsSpeaking(false);
      return;
    }

    if (speakText(latestAnswer.content)) {
      setIsSpeaking(true);
      window.setTimeout(() => setIsSpeaking(false), 30_000);
    }
  }

  return (
    <section
      className="console-card no-print"
      aria-labelledby="case-discussion-heading"
      style={{ padding: 24 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              color: "var(--accent)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Grounded follow-up
          </div>
          <h2
            id="case-discussion-heading"
            style={{
              color: "var(--foreground)",
              fontSize: 22,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Discuss your case
          </h2>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 13,
              lineHeight: 1.5,
              margin: "5px 0 0",
              maxWidth: 650,
            }}
          >
            Ask by voice or text. Answers use this report and the facts you
            provide—not assumptions about what happened.
          </p>
        </div>
        <button
          type="button"
          onClick={readLatestAnswer}
          className="chip-tag"
          style={{
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 11,
            padding: "7px 11px",
          }}
        >
          {isSpeaking ? "■ Stop audio" : "▶ Read latest answer"}
        </button>
      </div>

      <div
        aria-live="polite"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 390,
          overflowY: "auto",
          padding: 16,
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              alignSelf:
                message.role === "user" ? "flex-end" : "flex-start",
              background:
                message.role === "user"
                  ? "var(--accent)"
                  : "var(--surface-3)",
              border:
                message.role === "assistant"
                  ? "1px solid var(--border)"
                  : "none",
              borderRadius:
                message.role === "user"
                  ? "14px 14px 4px 14px"
                  : "14px 14px 14px 4px",
              color:
                message.role === "user"
                  ? "#ffffff"
                  : "var(--foreground)",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: "86%",
              padding: "10px 13px",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.content}
          </div>
        ))}
        {isThinking && (
          <div
            style={{
              alignSelf: "flex-start",
              color: "var(--muted)",
              fontSize: 13,
              padding: "4px 2px",
            }}
          >
            Reasoning from your report…
          </div>
        )}
        <div ref={conversationEndRef} />
      </div>

      <form
        onSubmit={submitQuestion}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 10,
          marginTop: 14,
        }}
      >
        <label htmlFor="case-question" className="sr-only">
          Ask a follow-up question about your case
        </label>
        <input
          id="case-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={isThinking}
          maxLength={2_000}
          placeholder="Example: What photos or records could support my explanation?"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--foreground)",
            fontSize: 14,
            minHeight: 46,
            outline: "none",
            padding: "0 13px",
            width: "100%",
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isThinking || !question.trim()}
          style={{
            borderRadius: 10,
            cursor: isThinking ? "wait" : "pointer",
            opacity: isThinking || !question.trim() ? 0.55 : 1,
            padding: "0 18px",
          }}
        >
          Ask Gemini
        </button>
      </form>

      <div style={{ marginTop: 14 }}>
        <VoiceInput
          onTranscript={(transcript) => void askQuestion(transcript)}
          label="Ask about your case by voice"
          listeningLabel="Listening… ask your case question"
          example="Example: “Would a dated photo help explain this?”"
          helperText="Your question is sent when speech recognition finishes. Text input remains available."
        />
      </div>

      {error && (
        <p
          role="alert"
          style={{
            color: "var(--rose-accent)",
            fontSize: 12,
            margin: "8px 0 0",
          }}
        >
          {error}
        </p>
      )}
      <p
        style={{
          color: "var(--muted)",
          fontSize: 11,
          lineHeight: 1.5,
          margin: "10px 0 0",
        }}
      >
        This discussion explains your statistical report and is not legal
        advice. Verify deadlines and procedural requirements on the official
        summons.
      </p>
    </section>
  );
}
