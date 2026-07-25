import { NextRequest, NextResponse } from "next/server";
import { extractTicket, synthesize } from "@/lib/gemini";
import { getStatsForCharge } from "@/lib/oath";
import type { Analysis, OathStats, TicketExtraction } from "@/lib/types";

const NOT_LEGAL_ADVICE =
  "This is a statistical summary of public hearing data, not legal advice.";

export async function POST(req: NextRequest) {
  let body: { imageBase64?: string; transcript?: string; chargeCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, transcript, chargeCode } = body;
  if (!imageBase64 && !transcript && !chargeCode) {
    return NextResponse.json(
      { error: "Provide imageBase64, transcript, or chargeCode" },
      { status: 400 }
    );
  }

  let extraction: TicketExtraction;
  if (chargeCode) {
    extraction = {
      chargeCode,
      chargeDescription: null,
      issuingAgency: null,
      violationDate: null,
      penaltyOnTicket: null,
      confidence: "high",
      unreadableFields: [],
    };
  } else {
    try {
      extraction = await extractTicket({ imageBase64, transcript });
    } catch (err) {
      console.error("extractTicket failed:", err);
      return NextResponse.json(
        { error: "Couldn't read the summons. Try entering the charge code directly." },
        { status: 502 }
      );
    }
  }

  let stats: OathStats | null = null;
  if (extraction.chargeCode) {
    try {
      stats = await getStatsForCharge(extraction.chargeCode);
    } catch (err) {
      console.error("getStatsForCharge failed:", err);
      stats = null;
    }
  }

  try {
    const synthesized = await synthesize(extraction, stats);
    const analysis: Analysis = {
      extraction,
      stats,
      ...synthesized,
    };
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("synthesize failed:", err);
    const fallback: Analysis = {
      extraction,
      stats,
      headline: extraction.chargeCode
        ? `We read charge code ${extraction.chargeCode} but couldn't generate a full analysis right now.`
        : "We couldn't identify a charge code or generate an analysis right now.",
      reasoning: "The AI synthesis step failed. The extracted data and stats above are still real.",
      defenseDraft: "",
      caveats: [NOT_LEGAL_ADVICE],
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
