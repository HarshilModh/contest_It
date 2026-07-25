"use client";

import { useState } from "react";

interface StatsAndFaqProps {
  onSelectCode: (code: string) => void;
}

export default function StatsAndFaq({ onSelectCode }: StatsAndFaqProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const AGENCY_STATS = [
    {
      agency: "DSNY",
      name: "Sanitation",
      rate: "31%",
      cases: "184,210",
      topCode: "16-118(2)",
      topLabel: "Sidewalk Snow/Ice",
      badgeColor: "#10b981",
      badgeDim: "rgba(16, 185, 129, 0.14)",
      borderColor: "rgba(16, 185, 129, 0.3)",
    },
    {
      agency: "DEP",
      name: "Environmental",
      rate: "45%",
      cases: "62,400",
      topCode: "24-244",
      topLabel: "Noise Violation",
      badgeColor: "#06b6d4",
      badgeDim: "rgba(6, 182, 212, 0.14)",
      borderColor: "rgba(6, 182, 212, 0.3)",
    },
    {
      agency: "DOB",
      name: "Buildings",
      rate: "28%",
      cases: "94,150",
      topCode: "28-301.1",
      topLabel: "Building Maintenance",
      badgeColor: "#f59e0b",
      badgeDim: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.3)",
    },
    {
      agency: "DOHMH",
      name: "Health Dept",
      rate: "39%",
      cases: "41,830",
      topCode: "81.07",
      topLabel: "Food Safety / Signage",
      badgeColor: "#ec4899",
      badgeDim: "rgba(236, 72, 153, 0.14)",
      borderColor: "rgba(236, 72, 153, 0.3)",
    },
  ];

  const STEPS = [
    {
      num: "01",
      title: "Scan & OCR",
      desc: "Gemini AI extracts summons violation codes, dates, and issuing agency instantly.",
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    },
    {
      num: "02",
      title: "Match OATH Database",
      desc: "Cross-reference 421,390+ public NYC hearing records for your specific charge.",
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    },
    {
      num: "03",
      title: "Calculate Odds",
      desc: "Get empirical dismissal probabilities, average penalty reductions, and case trends.",
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    },
    {
      num: "04",
      title: "Draft Defense",
      desc: "Generate a custom formal defense statement optimized for your hearing officer.",
      color: "#f43f5e",
      gradient: "linear-gradient(135deg, #f43f5e, #f59e0b)",
    },
  ];

  const FAQS = [
    {
      q: "Can I contest an NYC OATH summons online by myself?",
      a: "Yes! NYC OATH (Office of Administrative Trials and Hearings) allows summons recipients to contest tickets online, by mail, or phone without hiring an attorney. Providing a clear defense statement significantly increases your chances of dismissal.",
    },
    {
      q: "How are these dismissal odds calculated?",
      a: "Dismissal probabilities are computed directly from the NYC Open Data public dataset of over 400,000 completed OATH hearing decisions, matching exact charge codes against historical hearing officer verdicts.",
    },
    {
      q: "What happens if I ignore an OATH summons?",
      a: "Failing to respond or attend your scheduled hearing results in a default judgment, which automatically imposes maximum penalties, interest fees, and potential city property liens.",
    },
    {
      q: "Is this tool legal advice?",
      a: "No. Contest It provides statistical estimates derived from historical public records to help you prepare. It does not constitute formal legal counsel.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48, marginTop: 48 }}>
      {/* ── Key Live Metrics Strip ── */}
      <div
        className="console-card"
        style={{
          padding: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20,
          textAlign: "center",
        }}
      >
        <div style={{ padding: "12px", borderRadius: 14, background: "rgba(99, 102, 241, 0.06)", border: "1px solid rgba(99, 102, 241, 0.18)" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#6366f1", fontFamily: "var(--font-mono)" }}>421,390+</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 4 }}>
            Public Hearings Analyzed
          </div>
        </div>
        <div style={{ padding: "12px", borderRadius: 14, background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.18)" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", fontFamily: "var(--font-mono)" }}>31% – 45%</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 4 }}>
            Average Dismissal Range
          </div>
        </div>
        <div style={{ padding: "12px", borderRadius: 14, background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.18)" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#06b6d4", fontFamily: "var(--font-mono)" }}>$62.50</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 4 }}>
            Avg Penalty Imposed
          </div>
        </div>
        <div style={{ padding: "12px", borderRadius: 14, background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.18)" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>&lt; 3 Sec</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginTop: 4 }}>
            Instant AI OCR Scan
          </div>
        </div>
      </div>

      {/* ── Agency Benchmarks Grid ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
              Historical Agency Benchmarks
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "2px 0 0", color: "var(--foreground)" }}>
              NYC Agency Dismissal Rates
            </h2>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {AGENCY_STATS.map((item) => (
            <div
              key={item.agency}
              className="console-card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderColor: item.borderColor,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ background: item.badgeDim, color: item.badgeColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 800, border: `1px solid ${item.badgeColor}` }}>
                    {item.agency}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{item.cases} hearings</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 14 }}>
                  Top violation: <strong style={{ color: item.badgeColor }}>{item.topCode}</strong> ({item.topLabel})
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Dismissal Odds</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: item.badgeColor }}>{item.rate}</div>
                </div>
                <button
                  onClick={() => onSelectCode(item.topCode)}
                  className="chip-tag"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: item.badgeDim,
                    color: item.badgeColor,
                    borderColor: item.borderColor,
                    fontWeight: 700,
                  }}
                >
                  Test Code →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4-Step Process Workflow ── */}
      <div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
            Simplified Process
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
            How Contest It Works
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {STEPS.map((s) => (
            <div key={s.num} className="console-card" style={{ padding: "22px 18px", position: "relative", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 28, fontWeight: 900, background: s.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                {s.num}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ Accordion ── */}
      <div>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
            Got Questions?
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.q}
                className="console-card"
                style={{ padding: "18px 22px", cursor: "pointer" }}
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{faq.q}</div>
                  <div style={{ fontSize: 18, color: "var(--accent)", fontWeight: 700 }}>{isOpen ? "−" : "+"}</div>
                </div>
                {isOpen && (
                  <p style={{ fontSize: 14, color: "var(--muted-2)", lineHeight: 1.6, marginTop: 12, marginBottom: 0, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
