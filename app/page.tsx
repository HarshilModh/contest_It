"use client";

import { useEffect, useRef, useState } from "react";
import type { Analysis, OathStats } from "@/lib/types";
import { BASELINE, compareToBaseline } from "@/lib/baseline";
import ThemeToggle from "@/components/ThemeToggle";
import HeroSection from "@/components/HeroSection";
import StatsAndFaq from "@/components/StatsAndFaq";
import BackgroundAtmosphere from "@/components/BackgroundAtmosphere";
import CaseDiscussion from "@/components/CaseDiscussion";

type AppState = "input" | "loading" | "result" | "error";

const LOADING_STAGES = [
  "Reading ticket image via Gemini Vision OCR…",
  "Querying 400,000+ public NYC OATH hearing records…",
  "Synthesizing defense argument tailored for hearing officers…",
] as const;

function statusForRate(rate: number) {
  if (rate >= 0.4) return { color: "var(--emerald-accent)", dim: "var(--emerald-dim)", label: "Favorable Dismissal Odds" };
  if (rate >= 0.2) return { color: "var(--amber-accent)", dim: "var(--amber-dim)", label: "Mixed Hearing Odds" };
  return { color: "var(--rose-accent)", dim: "var(--rose-dim)", label: "Uphill Challenge" };
}

function formatPct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function formatUSD(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

/** "9 points above the citywide average" style copy for a single charge's rate. */
function baselineComparisonText(rate: number): string {
  const { direction, diff } = compareToBaseline(rate);
  const points = Math.round(Math.abs(diff) * 100);
  if (direction === "typical") {
    return `about typical for the ${BASELINE.codeCount} charge types we track`;
  }
  const word = direction === "above" ? "above" : "below";
  return `${points} point${points === 1 ? "" : "s"} ${word} the ${formatPct(BASELINE.rate)} average across the ${BASELINE.codeCount} charge types we track`;
}

// SVG Circular Ring Gauge for Probability Percentage
function RadialProbabilityRing({ rate, color }: { rate: number; color: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(rate, 1) * circumference;

  return (
    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.02em" }}>
          {formatPct(rate)}
        </div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700, marginTop: 4 }}>
          Dismissal Odds
        </div>
      </div>
    </div>
  );
}

// Outcome Proportion Bar
function OutcomeBar({ stats }: { stats: OathStats }) {
  const total = stats.totalCases || 1;
  const segments = [
    { key: "dismissed", label: "Dismissed", value: stats.outcomeBreakdown.dismissed, color: "var(--emerald-accent)" },
    { key: "in_violation", label: "In violation", value: stats.outcomeBreakdown.in_violation, color: "var(--rose-accent)" },
    { key: "settled", label: "Settled", value: stats.outcomeBreakdown.settled, color: "var(--amber-accent)" },
    { key: "other", label: "Other", value: stats.outcomeBreakdown.other, color: "var(--muted)" },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "var(--surface-3)", marginBottom: 14 }}>
        {segments.map((s, i) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.value.toLocaleString()} cases (${formatPct(s.value / total)})`}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              marginRight: i < segments.length - 1 ? 2 : 0,
              transition: "width 0.8s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {segments.map((s) => (
          <div key={s.key} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-2)", marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              {s.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
              {formatPct(s.value / total)}{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>({s.value.toLocaleString()})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "Should you contest?" decision box.
 *
 * `expectedCost` is the loss-weighted average penalty: (1 - dismissal rate) x
 * average penalty among cases actually found in violation. It only accounts
 * for the two outcomes we have a real dollar figure for (dismissed -> $0,
 * in violation -> avgPenaltyImposed) — settled cases exist but we don't have
 * a separate settlement dollar figure, so they're left out of the estimate
 * rather than guessed at, and that's disclosed in the caption.
 */
function ExpectedValueBox({ stats, ticketPenalty }: { stats: OathStats; ticketPenalty: number | null }) {
  if (stats.avgPenaltyImposed === null) return null;

  const loseRate = 1 - stats.dismissalRate;
  const expectedCost = loseRate * stats.avgPenaltyImposed;
  const worthContesting = ticketPenalty !== null ? expectedCost < ticketPenalty : expectedCost < stats.avgPenaltyImposed * 0.85;

  return (
    <div className="console-card" style={{ padding: "24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>
        Should you contest?
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Pay now</div>
          {ticketPenalty !== null ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{formatUSD(ticketPenalty)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>certain, 0 hearing days</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Amount on your ticket — not read from this input</div>
          )}
        </div>
        <div style={{ background: "var(--accent-dim)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--glass-border-hover)" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Expected cost if you contest</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)" }}>{formatUSD(expectedCost)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {formatPct(stats.dismissalRate)} chance $0 · {formatPct(loseRate)} chance ~{formatUSD(stats.avgPenaltyImposed)}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted-2)", lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
        {ticketPenalty !== null ? (
          worthContesting ? (
            <>Expected cost of contesting is <strong style={{ color: "var(--foreground)" }}>less</strong> than paying the {formatUSD(ticketPenalty)} ticket now — plus a hearing day.</>
          ) : (
            <>Expected cost of contesting is <strong style={{ color: "var(--foreground)" }}>close to or more than</strong> the {formatUSD(ticketPenalty)} ticket — weigh the hearing-day cost yourself.</>
          )
        ) : (
          <>This estimate covers dismissed and in-violation outcomes only, using the average penalty among cases found in violation — it excludes settled cases, which we don&apos;t have a separate dollar figure for. Compare it to the amount printed on your ticket.</>
        )}
      </p>
    </div>
  );
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("input");
  const [result, setResult] = useState<Analysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startStageTimer() {
    setLoadingStage(0);
    setRecordCount(0);
    let s = 0;
    stageTimerRef.current = setInterval(() => {
      s = Math.min(s + 1, LOADING_STAGES.length - 1);
      setLoadingStage(s);
    }, 2400);
  }

  function stopStageTimer() {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (appState !== "loading" || loadingStage !== 1) return;
    const target = 421390;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - start) / 1800, 1);
      setRecordCount(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [appState, loadingStage]);

  async function handleAnalyze(payload: { imageBase64?: string; transcript?: string; chargeCode?: string }) {
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
        setErrorMsg(data.error ?? "Could not analyze the ticket.");
        setAppState("error");
      } else {
        setResult(data as Analysis);
        setLoadingStage(LOADING_STAGES.length - 1);
        setTimeout(() => setAppState("result"), 300);
      }
    } catch {
      stopStageTimer();
      setErrorMsg("Network connection error.");
      setAppState("error");
    }
  }

  function reset() {
    setAppState("input");
    setResult(null);
    setErrorMsg("");
    setLoadingStage(0);
  }

  function copyDefenseText() {
    if (!result?.defenseDraft) return;
    navigator.clipboard.writeText(result.defenseDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadDefenseFile() {
    if (!result?.defenseDraft) return;
    const element = document.createElement("a");
    const file = new Blob([result.defenseDraft], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `OATH-Defense-${result.extraction.chargeCode ?? "Draft"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Interactive Constellation Particle Atmosphere Canvas */}
      <BackgroundAtmosphere />

      {/* Dynamic Floating Gradient Atmosphere Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Floating Ultra-Glass Navbar */}
      <div style={{ position: "sticky", top: 16, zIndex: 40, width: "100%", padding: "0 24px" }} className="no-print">
        <header
          className="glass-nav-floating"
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            height: 64,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={reset}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 14px var(--accent-glow)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M7 21h10M5 7l-3 6a3.5 3.5 0 007 0l-3-6h-1zM19 7l-3 6a3.5 3.5 0 007 0l-3-6h-1zM5 7h14M12 3l-3 4h6l-3-4z" />
              </svg>
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", color: "var(--foreground)" }}>Contest It</span>
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8, fontWeight: 700, letterSpacing: "0.04em" }}>NYC OATH AI</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            {appState !== "input" && (
              <button onClick={reset} className="btn-primary" style={{ borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
                + New Scan
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Main Workspace Area */}
      <main style={{ flex: 1, maxWidth: 1040, width: "100%", margin: "0 auto", padding: "40px 24px 80px", position: "relative", zIndex: 10 }}>
        {/* ─ HERO / INPUT STATE ─ */}
        {appState === "input" && (
          <>
            <HeroSection onAnalyze={handleAnalyze} />
            <StatsAndFaq onSelectCode={(code) => handleAnalyze({ chargeCode: code })} />
          </>
        )}

        {/* ─ LOADING STATE ─ */}
        {appState === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 36 }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div
                style={{
                  position: "absolute",
                  inset: -18,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  filter: "blur(28px)",
                  opacity: 0.35,
                  animation: "livePulse 1.8s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "4px solid var(--surface-3)",
                  borderTopColor: "var(--accent)",
                  animation: "spin 0.85s linear infinite",
                }}
              />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 440 }}>
              {LOADING_STAGES.map((stageText, idx) => (
                <div
                  key={stageText}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    opacity: idx > loadingStage ? 0.35 : 1,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: idx < loadingStage ? "var(--emerald-accent)" : idx === loadingStage ? "var(--surface-3)" : "var(--surface-2)",
                      border: idx === loadingStage ? "2px solid var(--accent)" : "none",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {idx < loadingStage ? "✓" : idx + 1}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: idx === loadingStage ? 700 : 500, color: "var(--foreground)" }}>
                    {stageText}
                  </span>
                </div>
              ))}
              {loadingStage === 1 && (
                <div style={{ marginLeft: 40, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)", fontWeight: 700 }}>
                  {recordCount.toLocaleString()} hearing records scanned
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─ ERROR STATE ─ */}
        {appState === "error" && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--rose-accent)", marginBottom: 12 }}>Analysis Request Failed</div>
            <p style={{ color: "var(--muted-2)", marginBottom: 24 }}>{errorMsg}</p>
            <button onClick={reset} className="btn-primary" style={{ padding: "10px 20px", borderRadius: 10 }}>
              Try Again
            </button>
          </div>
        )}

        {/* ─ RESULT STATE (CIVIC BRIEFING DASHBOARD) ─ */}
        {appState === "result" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Top Analysis Banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>
                  NYC OATH Analysis Report
                </span>
                <h1 style={{ fontSize: 26, fontWeight: 800, margin: "2px 0 0", color: "var(--foreground)" }}>
                  {result.extraction.chargeDescription ?? result.extraction.chargeCode ?? "Summons Violation Analysis"}
                </h1>
              </div>
              <button onClick={reset} className="chip-tag no-print" style={{ borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
                ← Scan Another Ticket
              </button>
            </div>

            {/* Split Dashboard Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {/* Left Panel: Verdict & Data Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Radial Gauge Verdict Card */}
                {result.stats && (
                  <div
                    className="console-card"
                    style={{
                      padding: "28px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      background: `linear-gradient(135deg, ${statusForRate(result.stats.dismissalRate).dim}, var(--glass-card-bg))`,
                    }}
                  >
                    <RadialProbabilityRing rate={result.stats.dismissalRate} color={statusForRate(result.stats.dismissalRate).color} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: statusForRate(result.stats.dismissalRate).color,
                          marginBottom: 6,
                        }}
                      >
                        {statusForRate(result.stats.dismissalRate).label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4, marginBottom: 8 }}>
                        {result.headline}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Based on {result.stats.totalCases.toLocaleString()} historical NYC hearings ({result.stats.sampleWindow}) —{" "}
                        {baselineComparisonText(result.stats.dismissalRate)}.
                      </div>
                    </div>
                  </div>
                )}

                {/* Reasoning Card */}
                <div className="console-card" style={{ padding: "24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 8 }}>
                    Analytical Summary
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--muted-2)", margin: 0 }}>{result.reasoning}</p>
                </div>

                {/* Outcome Breakdown Card */}
                {result.stats && (
                  <div className="console-card" style={{ padding: "24px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14 }}>
                      Case Outcomes Breakdown · {result.stats.totalCases.toLocaleString()} Total Hearings
                    </div>
                    <OutcomeBar stats={result.stats} />
                    {result.stats.avgPenaltyImposed !== null && (
                      <div style={{ display: "flex", gap: 16, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Avg Imposed Penalty</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)" }}>${result.stats.avgPenaltyImposed}</div>
                        </div>
                        {result.stats.medianPenaltyImposed !== null && (
                          <div>
                            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Median Penalty</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)" }}>${result.stats.medianPenaltyImposed}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {result.stats && (
                  <ExpectedValueBox stats={result.stats} ticketPenalty={result.extraction.penaltyOnTicket} />
                )}
              </div>

              {/* Right Panel: Formal OATH Defense Brief */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="defense-brief" style={{ padding: "24px" }}>
                  {/* Brief Header Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                        DOC ID: OATH-DEF-2026
                      </span>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", marginTop: 2 }}>Formal Defense Brief</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }} className="no-print">
                      <button onClick={downloadDefenseFile} className="chip-tag" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
                        Download .txt
                      </button>
                      <button onClick={() => window.print()} className="chip-tag" style={{ padding: "5px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
                        Print Brief
                      </button>
                      <button onClick={copyDefenseText} className="btn-primary" style={{ padding: "5px 12px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Brief Text Content */}
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--foreground)",
                      whiteSpace: "pre-wrap",
                      background: "var(--surface-2)",
                      padding: "18px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {result.defenseDraft}
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }} className="no-print">
                  {result.caveats.map((c, i) => (
                    <p key={i} style={{ margin: "4px 0" }}>
                      {c}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <CaseDiscussion analysis={result} />
          </div>
        )}
      </main>

      {/* Footer Console */}
      <footer
        className="no-print"
        style={{
          position: "relative",
          zIndex: 10,
          borderTop: "1px solid var(--border)",
          padding: "20px 32px",
          background: "var(--glass-nav-bg)",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          color: "var(--muted)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          Powered by <strong style={{ color: "var(--foreground)" }}>Gemini AI</strong> · Dataset:{" "}
          <strong style={{ color: "var(--foreground)" }}>NYC OATH Hearings Public Data</strong>
        </div>
        <div>Not legal advice. Statistical estimates derived from public records.</div>
      </footer>
    </div>
  );
}
