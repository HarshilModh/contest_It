"use client";

import { useCallback, useRef, useState } from "react";
import type { Analysis } from "@/lib/types";
import VoiceInput from "@/components/VoiceInput";

// ─── Types ──────────────────────────────────────────────────────────────────

type AppState = "input" | "loading" | "result" | "error";

const LOADING_STAGES = [
  "Reading your summons…",
  "Querying 400,000 hearing records…",
  "Drafting your defense…",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dismissalColor(rate: number): string {
  if (rate >= 0.4) return "#22c55e"; // green
  if (rate >= 0.2) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function formatPct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
        flex: "1 1 140px",
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function LoadingIndicator({ stage }: { stage: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        padding: "64px 0",
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "3px solid var(--surface-3)",
          borderTopColor: "var(--accent)",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Stages */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {LOADING_STAGES.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: i > stage ? 0.3 : 1,
              transition: "opacity 0.4s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  i < stage
                    ? "var(--accent)"
                    : i === stage
                    ? "var(--surface-3)"
                    : "var(--surface-2)",
                border:
                  i === stage
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i < stage && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5l2.5 2.5L8 3"
                    stroke="#000"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 14,
                color: i === stage ? "var(--foreground)" : "var(--muted)",
                fontWeight: i === stage ? 600 : 400,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerdictCard({ data }: { data: Analysis }) {
  const [copied, setCopied] = useState(false);
  const { extraction, stats, headline, reasoning, defenseDraft, caveats } =
    data;
  const rate = stats?.dismissalRate ?? 0;
  const color = dismissalColor(rate);

  function copyDefense() {
    navigator.clipboard.writeText(defenseDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Headline */}
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${color}33`,
          borderRadius: 12,
          padding: "28px 28px 24px",
        }}
      >
        {stats && (
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
              color,
              fontVariantNumeric: "tabular-nums",
              marginBottom: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            {formatPct(rate)}
          </div>
        )}
        <p
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--foreground)",
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {headline}
        </p>
        {stats && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                background: stats.dataSource === "live" ? "#22c55e22" : "var(--surface-2)",
                color: stats.dataSource === "live" ? "#22c55e" : "var(--muted)",
                border: `1px solid ${stats.dataSource === "live" ? "#22c55e44" : "var(--border)"}`,
                borderRadius: 4,
                padding: "1px 7px",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {stats.dataSource === "live" ? "Live data" : "Cached data"}
            </span>
            <span>
              {stats.sampleWindow} · {stats.totalCases.toLocaleString()} cases
            </span>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          What the data shows
        </div>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--muted-2)",
            margin: 0,
          }}
        >
          {reasoning}
        </p>
      </div>

      {/* Stats breakdown */}
      {stats && (
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            Outcome breakdown
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <StatBox
              label="Dismissed"
              value={`${stats.outcomeBreakdown.dismissed.toLocaleString()}`}
              sub={formatPct(stats.dismissalRate)}
            />
            <StatBox
              label="In violation"
              value={`${stats.outcomeBreakdown.in_violation.toLocaleString()}`}
              sub={formatPct(
                stats.outcomeBreakdown.in_violation / stats.totalCases
              )}
            />
            {stats.avgPenaltyImposed !== null && (
              <StatBox
                label="Avg penalty imposed"
                value={`$${stats.avgPenaltyImposed}`}
                sub={
                  stats.medianPenaltyImposed !== null
                    ? `median $${stats.medianPenaltyImposed}`
                    : undefined
                }
              />
            )}
            <StatBox
              label="Charge"
              value={extraction.chargeCode ?? "—"}
              sub={extraction.issuingAgency ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Defense draft */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            Your defense statement
          </div>
          <button
            id="copy-defense-btn"
            onClick={copyDefense}
            style={{
              background: copied ? "var(--accent)" : "var(--surface-3)",
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              padding: "5px 12px",
              color: copied ? "#000" : "var(--muted-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--muted-2)",
              margin: 0,
              fontFamily: "var(--font-mono)",
              whiteSpace: "pre-wrap",
            }}
          >
            {defenseDraft}
          </p>
        </div>
      </div>

      {/* Extraction meta */}
      {extraction.confidence !== "high" && (
        <div
          style={{
            background: "#f59e0b11",
            border: "1px solid #f59e0b33",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: "#f59e0b",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span>⚠</span>
          <span>
            Gemini extracted this ticket with{" "}
            <strong>{extraction.confidence}</strong> confidence.
            {extraction.unreadableFields.length > 0
              ? ` Fields not clearly read: ${extraction.unreadableFields.join(", ")}.`
              : " Consider verifying the charge code."}{" "}
            You can type the correct code below and re-analyze.
          </span>
        </div>
      )}

      {/* Caveats */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        {caveats.map((c, i) => (
          <p
            key={i}
            style={{
              fontSize: 12,
              color: "var(--muted)",
              margin: "4px 0",
              lineHeight: 1.6,
            }}
          >
            {c}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>("input");
  const [result, setResult] = useState<Analysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);
  const [chargeCode, setChargeCode] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startStageTimer() {
    setLoadingStage(0);
    let s = 0;
    stageTimerRef.current = setInterval(() => {
      s = Math.min(s + 1, LOADING_STAGES.length - 1);
      setLoadingStage(s);
    }, 2500);
  }

  function stopStageTimer() {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }

  async function analyze(payload: {
    imageBase64?: string;
    transcript?: string;
    chargeCode?: string;
  }) {
    setAppState("loading");
    startStageTimer();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      stopStageTimer();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setAppState("error");
      } else {
        setResult(data as Analysis);
        setLoadingStage(LOADING_STAGES.length - 1);
        setTimeout(() => setAppState("result"), 300);
      }
    } catch {
      stopStageTimer();
      setErrorMsg("Network error — check your connection and try again.");
      setAppState("error");
    }
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = chargeCode.trim();
    if (!code) return;
    analyze({ chargeCode: code });
  }

  function handleVoiceTranscript(transcript: string) {
    setChargeCode(transcript);
    analyze({ transcript });
  }

  const handleFileDrop = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        analyze({ imageBase64: base64 });
      };
      reader.readAsDataURL(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileDrop(file);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
  }

  function reset() {
    setAppState("input");
    setResult(null);
    setErrorMsg("");
    setChargeCode("");
    setLoadingStage(0);
  }

  // ── Styles ──
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "var(--background)",
    display: "flex",
    flexDirection: "column",
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--border)",
    padding: "0 24px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "var(--surface)",
    flexShrink: 0,
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: 720,
    width: "100%",
    margin: "0 auto",
    padding: "40px 24px 80px",
  };

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border-strong)"}`,
    borderRadius: 12,
    background: isDragging ? "var(--accent-dim)" : "var(--surface)",
    padding: "40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "var(--surface-2)",
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    padding: "11px 14px",
    color: "var(--foreground)",
    fontSize: 14,
    fontFamily: "var(--font-mono)",
    outline: "none",
    width: "100%",
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: "var(--accent)",
    border: "none",
    borderRadius: 8,
    padding: "11px 20px",
    color: "#000",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "opacity 0.15s",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted)",
    fontWeight: 600,
    marginBottom: 10,
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: "#000" }}>⚖</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
            Contest It
          </span>
          <span
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "1px 7px",
              fontSize: 10,
              color: "var(--muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            NYC
          </span>
        </div>
        {appState !== "input" && (
          <button
            id="reset-btn"
            onClick={reset}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "5px 12px",
              color: "var(--muted-2)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ← New ticket
          </button>
        )}
      </header>

      <main style={mainStyle}>
        {/* ─ INPUT STATE ─ */}
        {appState === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  margin: "0 0 8px",
                  lineHeight: 1.2,
                  color: "var(--foreground)",
                }}
              >
                What are your odds?
              </h1>
              <p style={{ fontSize: 15, color: "var(--muted-2)", margin: 0, lineHeight: 1.6 }}>
                Upload a photo of your NYC summons — or type the violation code — and
                we&apos;ll compute your real dismissal odds from{" "}
                <strong style={{ color: "var(--foreground)" }}>400,000+ hearing records.</strong>
              </p>
            </div>

            {/* Drop zone */}
            <div>
              <div style={sectionLabelStyle}>Upload ticket photo</div>
              <div
                id="drop-zone"
                style={dropZoneStyle}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload ticket photo"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  📎
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--foreground)",
                      marginBottom: 4,
                    }}
                  >
                    Drop ticket photo here
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    or click to browse · JPG, PNG, HEIC
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--muted)",
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Manual code entry */}
            <div>
              <div style={sectionLabelStyle}>Enter violation code</div>
              <form
                onSubmit={handleCodeSubmit}
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  id="charge-code-input"
                  type="text"
                  style={inputStyle}
                  value={chargeCode}
                  onChange={(e) => setChargeCode(e.target.value)}
                  placeholder="e.g. A.C. 16-118 2 A"
                  aria-label="Violation charge code"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  id="analyze-btn"
                  type="submit"
                  style={primaryBtnStyle}
                  disabled={!chargeCode.trim()}
                >
                  Analyze →
                </button>
              </form>
            </div>

            {/* Voice input slot */}
            <div>
              <div style={sectionLabelStyle}>Or say it out loud</div>
              <VoiceInput onTranscript={handleVoiceTranscript} />
            </div>
          </div>
        )}

        {/* ─ LOADING STATE ─ */}
        {appState === "loading" && (
          <LoadingIndicator stage={loadingStage} />
        )}

        {/* ─ ERROR STATE ─ */}
        {appState === "error" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: "60px 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40 }}>⚠</div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                Couldn&apos;t analyze the ticket
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--muted-2)",
                  maxWidth: 400,
                  margin: "0 auto",
                  lineHeight: 1.7,
                }}
              >
                {errorMsg || "An unexpected error occurred."}
              </p>
              {errorMsg.toLowerCase().includes("charge code") && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    maxWidth: 400,
                    margin: "10px auto 0",
                  }}
                >
                  We couldn&apos;t read the charge code from the image. Try typing it
                  manually below.
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                id="try-again-btn"
                onClick={reset}
                style={primaryBtnStyle}
              >
                Try again
              </button>
              <form
                onSubmit={handleCodeSubmit}
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  id="error-charge-code-input"
                  type="text"
                  style={{ ...inputStyle, width: 200 }}
                  value={chargeCode}
                  onChange={(e) => setChargeCode(e.target.value)}
                  placeholder="Type charge code"
                  aria-label="Violation charge code"
                />
                <button
                  id="error-analyze-btn"
                  type="submit"
                  style={primaryBtnStyle}
                  disabled={!chargeCode.trim()}
                >
                  Analyze
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─ RESULT STATE ─ */}
        {appState === "result" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div style={sectionLabelStyle}>Analysis complete</div>
                <h1
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--foreground)",
                  }}
                >
                  {result.extraction.chargeDescription ?? result.extraction.chargeCode ?? "NYC Summons"}
                </h1>
              </div>
            </div>
            <VerdictCard data={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "var(--surface)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Powered by{" "}
          <strong style={{ color: "var(--muted-2)" }}>Gemini</strong> ·
          Data from{" "}
          <strong style={{ color: "var(--muted-2)" }}>NYC OATH Hearings Dataset</strong>
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          This is not legal advice.
        </span>
      </footer>
    </div>
  );
}
