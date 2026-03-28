/** WebSocket + REST DTOs aligned with FranchiseIQ Live spec §9.3 / §9.6 */

export type WsMessageType =
  | "FRAME"
  | "AUDIO_IN"
  | "AUDIO_OUT"
  | "SCORE_UPDATE"
  | "FINDING"
  | "TRANSCRIPT_TURN"
  | "SITE_PINNED"
  | "SITE_CLOSED"
  | "SESSION_STATUS"
  | "ERROR"
  | "PING"
  | "PONG";

export interface FramePayload {
  image_base64: string;
  lat: number;
  lng: number;
  accuracy_m?: number;
  timestamp: string;
  site_id: string;
}

export interface AudioInPayload {
  pcm_base64: string;
  timestamp: string;
  site_id?: string;
  text?: string;
  lat?: number;
  lng?: number;
  audio_format?: string;
  is_final?: boolean;
}

export interface AudioOutPayload {
  pcm_base64: string;
  timestamp: string;
  audio_format?: string;
  sample_rate_hz?: number;
  is_final?: boolean;
}

export interface ScoreUpdatePayload {
  composite_score: number;
  traffic_score: number;
  risk_score: number;
  competition_score: number;
  confidence: number;
  score_delta: number;
  agent_name?: string;
}

export interface FindingPayload {
  agent_name: string;
  finding_text: string;
  source_citations: { label: string; detail?: string }[];
  timestamp: string;
}

export interface TranscriptTurnPayload {
  speaker: "user" | "ai";
  text: string;
  timestamp: string;
  mode: "narration" | "query";
}

export interface SitePinnedPayload {
  site_id: string;
  address: string;
  lat: number;
  lng: number;
  sequence_num: number;
}

export interface SiteClosedPayload {
  site_id: string;
  final_composite_score: number;
}

export interface SessionStatusPayload {
  status: "active" | "closed";
  site_count: number;
}

export interface ErrorPayload {
  error_code: string;
  message: string;
  recoverable: boolean;
}

export type ServerMessage =
  | { type: "AUDIO_OUT"; payload: AudioOutPayload }
  | { type: "SCORE_UPDATE"; payload: ScoreUpdatePayload }
  | { type: "FINDING"; payload: FindingPayload }
  | { type: "TRANSCRIPT_TURN"; payload: TranscriptTurnPayload }
  | { type: "SITE_PINNED"; payload: SitePinnedPayload }
  | { type: "SITE_CLOSED"; payload: SiteClosedPayload }
  | { type: "SESSION_STATUS"; payload: SessionStatusPayload }
  | { type: "ERROR"; payload: ErrorPayload }
  | { type: "PONG"; payload?: Record<string, never> };

export function isServerMessage(x: unknown): x is ServerMessage {
  return (
    typeof x === "object" &&
    x !== null &&
    "type" in x &&
    typeof (x as { type: string }).type === "string"
  );
}

export type CommandPayload = {
  action: "pin_site" | "close_site" | "end_session";
  site_id?: string;
};

export type ClientMessage =
  | { type: "FRAME"; payload: FramePayload }
  | { type: "AUDIO_IN"; payload: AudioInPayload }
  | { type: "COMMAND"; payload: CommandPayload }
  | { type: "PING"; payload?: Record<string, never> };

export interface CreateProjectResponse {
  project_id: string;
}

export interface StartSessionResponse {
  session_id: string;
}

export interface SiteSummary {
  id: string;
  sequenceNum: number;
  addressStub: string;
  compositeScore: number | null;
  status: "active" | "locked";
}
