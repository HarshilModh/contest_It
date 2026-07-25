/**
 * Minimal browser typings for the Web Speech API.
 *
 * SpeechRecognition is still vendor-prefixed in Chrome and is not included in
 * every TypeScript DOM definition, so keeping the small surface we use here
 * avoids adding a dependency or widening the global Window type.
 */
export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as SpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function createSpeechRecognition(): BrowserSpeechRecognition | null {
  const Recognition = getSpeechRecognitionConstructor();

  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;
  return recognition;
}

export function transcriptFromResults(
  results: SpeechRecognitionResultListLike,
): string {
  const phrases: string[] = [];

  for (let index = 0; index < results.length; index += 1) {
    const phrase = results[index]?.[0]?.transcript.trim();
    if (phrase) {
      phrases.push(phrase);
    }
  }

  return phrases.join(" ").replace(/\s+/g, " ").trim();
}

export function hasFinalResult(
  results: SpeechRecognitionResultListLike,
): boolean {
  for (let index = 0; index < results.length; index += 1) {
    if (results[index]?.isFinal) {
      return true;
    }
  }

  return false;
}

export function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow it in your browser, or type the code instead.";
    case "audio-capture":
      return "No microphone was found. Connect one, or type the code instead.";
    case "network":
      return "Voice recognition could not reach its service. Type the code instead.";
    case "no-speech":
      return "I didn’t hear anything. Try again and say the violation code slowly.";
    case "aborted":
      return "";
    default:
      return "Voice input stopped unexpectedly. Try again, or type the code instead.";
  }
}

export function speakText(text: string): boolean {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
