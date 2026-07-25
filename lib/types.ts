export type Outcome = "dismissed" | "in_violation" | "settled" | "other";

  export interface TicketExtraction {
    chargeCode: string | null;
    chargeDescription: string | null;
    issuingAgency: string | null;
    violationDate: string | null;
    penaltyOnTicket: number | null;
    confidence: "high" | "medium" | "low";
    unreadableFields: string[];
  }

  export interface OathStats {
    chargeCode: string;
    totalCases: number;
    dismissalRate: number;
    outcomeBreakdown: Record<Outcome, number>;
    avgPenaltyImposed: number | null;
    medianPenaltyImposed: number | null;
    dataSource: "live" | "cached";
    sampleWindow: string;
  }

  export interface Analysis {
    extraction: TicketExtraction;
    stats: OathStats | null;
    headline: string;
    reasoning: string;
    defenseDraft: string;
    caveats: string[];
  }

  export type CaseDiscussionRole = "user" | "assistant";

  export interface CaseDiscussionMessage {
    role: CaseDiscussionRole;
    content: string;
  }

  export interface CaseDiscussionResponse {
    answer: string;
  }
