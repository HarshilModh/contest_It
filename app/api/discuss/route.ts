import { NextResponse } from "next/server";

import { discussCase } from "@/lib/gemini";
import type {
  Analysis,
  CaseDiscussionMessage,
  CaseDiscussionResponse,
} from "@/lib/types";

const MAX_QUESTION_LENGTH = 2_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2_000;

interface DiscussionRequest {
  analysis?: Analysis;
  messages?: CaseDiscussionMessage[];
  question?: string;
}

function isAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Analysis>;
  return (
    Boolean(candidate.extraction) &&
    typeof candidate.headline === "string" &&
    typeof candidate.reasoning === "string" &&
    typeof candidate.defenseDraft === "string" &&
    Array.isArray(candidate.caveats)
  );
}

function cleanHistory(value: unknown): CaseDiscussionMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (message): message is CaseDiscussionMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }));
}

export async function POST(request: Request) {
  let body: DiscussionRequest;

  try {
    body = (await request.json()) as DiscussionRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const question = body.question?.trim();

  if (!isAnalysis(body.analysis)) {
    return NextResponse.json(
      { error: "A completed case analysis is required." },
      { status: 400 },
    );
  }

  if (!question) {
    return NextResponse.json(
      { error: "Ask a question about the case." },
      { status: 400 },
    );
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: "Keep the question under 2,000 characters." },
      { status: 400 },
    );
  }

  try {
    const answer = await discussCase({
      analysis: body.analysis,
      messages: cleanHistory(body.messages),
      question,
    });
    const response: CaseDiscussionResponse = { answer };
    return NextResponse.json(response);
  } catch (error) {
    console.error("discussCase failed:", error);
    return NextResponse.json(
      {
        error:
          "The case discussion is unavailable right now. Your original analysis is still available.",
      },
      { status: 502 },
    );
  }
}
