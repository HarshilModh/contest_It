"use client";

import { useRef, useState } from "react";
import VoiceInput from "@/components/VoiceInput";

interface HeroSectionProps {
  onAnalyze: (payload: { imageBase64?: string; transcript?: string; chargeCode?: string }) => void;
}

export default function HeroSection({ onAnalyze }: HeroSectionProps) {
  const [chargeCodeInput, setChargeCodeInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const QUICK_SAMPLES = [
    { code: "16-118(2)", agency: "DSNY", label: "Sidewalk Snow/Ice", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
    { code: "A.C. 16-120 C", agency: "DSNY", label: "Storage of Receptacles", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
    { code: "10-125", agency: "—", label: "Highest dismissal rate (62%)", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
    { code: "28-301.1", agency: "DOB", label: "Lowest dismissal rate (10%)", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  ];

  function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!chargeCodeInput.trim()) return;
    onAnalyze({ chargeCode: chargeCodeInput.trim() });
  }

  function handleFileSelected(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      onAnalyze({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  }

  return (
    <section style={{ padding: "12px 0 40px" }}>
      {/* Top Status Bar Ticker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px",
          borderRadius: 999,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          width: "fit-content",
          marginBottom: 24,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted-2)",
        }}
      >
        <span className="live-pulse" />
        <span>OATH Live Hearing Database Connected</span>
        <span style={{ color: "var(--muted)" }}>|</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>421,390 Records</span>
      </div>

      {/* Main Asymmetric Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 36,
          alignItems: "center",
        }}
      >
        {/* Left Column: Hero Copy & Value Props */}
        <div>
          <h1
            className="gradient-heading"
            style={{
              fontSize: "clamp(34px, 4.5vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
              margin: "0 0 20px",
            }}
          >
            Know your dismissal odds before you pay.
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 1.8vw, 18px)",
              color: "var(--muted-2)",
              lineHeight: 1.6,
              margin: "0 0 28px",
            }}
          >
            Don&apos;t automatically pay NYC summonses. Upload your ticket or search a charge code to calculate real dismissal probabilities from historical hearing records and generate a custom defense statement.
          </p>

          {/* Quick Agency Chips */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
              Popular Violation Codes
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_SAMPLES.map((s) => (
                <button
                  key={s.code}
                  onClick={() => onAnalyze({ chargeCode: s.code })}
                  className="chip-tag"
                  style={{
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderColor: s.color,
                  }}
                >
                  <span style={{ background: s.bg, color: s.color, padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                    {s.agency}
                  </span>
                  <strong style={{ color: "var(--foreground)" }}>{s.code}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Scanner Console Viewfinder */}
        <div
          className="console-card"
          style={{
            position: "relative",
            padding: "28px 24px",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 14 }}>
            Ticket OCR Scanner Console
          </div>

          {/* Viewfinder Drop Zone */}
          <div
            className={`drop-zone ${isDragging ? "drop-zone-active" : ""}`}
            style={{
              position: "relative",
              padding: "36px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              textAlign: "center",
              marginBottom: 20,
              overflow: "hidden",
              background: "linear-gradient(rgba(79, 70, 229, 0.03), rgba(79, 70, 229, 0.08))",
              borderRadius: "16px",
              border: "1px dashed var(--accent-glow)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Animated Scan Line */}
            <div className="scan-laser" />

            {/* Camera Viewfinder Bracket Corners */}
            <div style={{ position: "absolute", top: 10, left: 10, width: 14, height: 14, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)" }} />
            <div style={{ position: "absolute", top: 10, right: 10, width: 14, height: 14, borderTop: "2px solid var(--accent)", borderRight: "2px solid var(--accent)" }} />
            <div style={{ position: "absolute", bottom: 10, left: 10, width: 14, height: 14, borderBottom: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)" }} />
            <div style={{ position: "absolute", bottom: 10, right: 10, width: 14, height: 14, borderBottom: "2px solid var(--accent)", borderRight: "2px solid var(--accent)" }} />

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--accent-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
                Drop Ticket Image Here
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Click to select photo (JPG, PNG, HEIC)</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
          </div>

          {/* Manual Input Alternative */}
          <form onSubmit={handleSubmitCode} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              className="text-input"
              style={{
                flex: 1,
                borderRadius: 10,
                padding: "11px 14px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
              value={chargeCodeInput}
              onChange={(e) => setChargeCodeInput(e.target.value)}
              placeholder="Or enter code e.g. 16-118(2)"
            />
            <button type="submit" className="btn-primary" style={{ borderRadius: 10, padding: "11px 18px", fontSize: 14 }} disabled={!chargeCodeInput.trim()}>
              Analyze
            </button>
          </form>

          {/* Voice Search */}
          <VoiceInput onTranscript={(t) => onAnalyze({ transcript: t })} />
        </div>
      </div>
    </section>
  );
}
