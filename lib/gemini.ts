import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { Analysis, OathStats, TicketExtraction } from "./types";

// "gemini-flash-latest" is the AI Studio alias for the current stable Flash
// model — avoids hardcoding a version string that goes stale mid-event.
const MODEL_NAME = "gemini-flash-latest";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured data from New York City summonses (tickets).
You will receive either a photograph of a summons or a spoken description of one.
Return ONLY JSON matching the provided schema.

Rules:
- Report the violation/charge code EXACTLY as printed. Do not normalize or guess format.
- If a field is unreadable, set it to null and list the field name in unreadableFields.
- Set confidence to "low" if the image is blurry, cropped, or you are inferring the
  charge code rather than reading it.
- NEVER invent a charge code. A null with low confidence is a correct answer;
  a plausible-looking wrong code is a failure.`;

const extractionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    chargeCode: { type: SchemaType.STRING, nullable: true },
    chargeDescription: { type: SchemaType.STRING, nullable: true },
    issuingAgency: { type: SchemaType.STRING, nullable: true },
    violationDate: { type: SchemaType.STRING, nullable: true },
    penaltyOnTicket: { type: SchemaType.NUMBER, nullable: true },
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["high", "medium", "low"],
    },
    unreadableFields: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "chargeCode",
    "chargeDescription",
    "issuingAgency",
    "violationDate",
    "penaltyOnTicket",
    "confidence",
    "unreadableFields",
  ],
};

export async function extractTicket(input: {
  imageBase64?: string;
  transcript?: string;
}): Promise<TicketExtraction> {
  const { imageBase64, transcript } = input;
  if (!imageBase64 && !transcript) {
    throw new Error("extractTicket requires imageBase64 or transcript");
  }

  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: EXTRACTION_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    },
  });

  const parts = imageBase64
    ? [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
        { text: "Extract the ticket fields from this summons photo." },
      ]
    : [
        {
          text: `Extract the ticket fields from this spoken description: "${transcript}"`,
        },
      ];

  const result = await model.generateContent(parts);
  const parsed = JSON.parse(result.response.text());
  return parsed as TicketExtraction;
}

const SYNTHESIS_SYSTEM_PROMPT = `You are given (a) the details of a NYC summons and (b) real aggregate outcome statistics
computed from the NYC OATH hearings public dataset.

Write:
- headline: one sentence stating the person's realistic odds, using the actual number.
- reasoning: 2-3 sentences explaining what the data shows and what drives outcomes for
  this charge type.
- defenseDraft: a short, factual statement the person could read at their hearing.
  First person. No invented facts about their situation — use [bracketed placeholders]
  where they must fill in specifics.
- caveats: string array. ALWAYS include: "This is a statistical summary of public
  hearing data, not legal advice."

Never state a statistic that is not present in the provided stats object.
If stats is null, say plainly that we have no outcome data for this code and skip the odds.
Return ONLY JSON matching the provided schema.`;

const synthesisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    reasoning: { type: SchemaType.STRING },
    defenseDraft: { type: SchemaType.STRING },
    caveats: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["headline", "reasoning", "defenseDraft", "caveats"],
};

export async function synthesize(
  extraction: TicketExtraction,
  stats: OathStats | null
): Promise<Pick<Analysis, "headline" | "reasoning" | "defenseDraft" | "caveats">> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYNTHESIS_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: synthesisSchema,
    },
  });

  const prompt = JSON.stringify({ extraction, stats });
  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return parsed as Pick<Analysis, "headline" | "reasoning" | "defenseDraft" | "caveats">;
}
