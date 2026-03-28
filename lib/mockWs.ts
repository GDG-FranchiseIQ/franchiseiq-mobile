import type { ClientMessage, ServerMessage } from "./types";

/** In-process mock that simulates SCORE_UPDATE / FINDING / TRANSCRIPT for UI dev. */
export function createMockWsHandlers(options: {
  onMessage: (msg: ServerMessage) => void;
  siteId: string;
}) {
  let tick = 0;
  let lastComposite = 50;
  let interval: ReturnType<typeof setInterval> | null = null;

  function handleClient(msg: ClientMessage) {
    if (msg.type === "COMMAND") {
      if (msg.payload.action === "close_site") {
        options.onMessage({
          type: "SITE_CLOSED",
          payload: {
            site_id: options.siteId,
            final_composite_score: lastComposite,
          },
        });
      }
      if (msg.payload.action === "pin_site") {
        options.onMessage({
          type: "SITE_PINNED",
          payload: {
            site_id: options.siteId,
            address: "Pinned location",
            lat: 40.7128,
            lng: -74.006,
            sequence_num: 1,
          },
        });
      }
      return;
    }
    if (msg.type === "FRAME") {
      tick += 1;
      const base = 40 + Math.min(55, tick * 3);
      const jitter = Math.floor(Math.random() * 5);
      const composite = Math.min(100, base + jitter);
      lastComposite = composite;
      options.onMessage({
        type: "SCORE_UPDATE",
        payload: {
          composite_score: composite,
          traffic_score: Math.min(10, composite / 10),
          risk_score: 10 - Math.min(10, jitter),
          competition_score: 6,
          confidence: Math.min(1, 0.4 + tick * 0.05),
          score_delta: tick > 1 ? 3 : 0,
          agent_name: "Vision",
        },
      });
      if (composite > 55 && tick % 4 === 0) {
        options.onMessage({
          type: "FINDING",
          payload: {
            agent_name: "Risk Agent",
            finding_text: "Moderate 311 noise complaints in 90-day window.",
            source_citations: [{ label: "NYC 311", detail: "grid cell" }],
            timestamp: Date.now(),
          },
        });
      }
    }
    if (msg.type === "AUDIO_IN" && Math.random() > 0.92) {
      options.onMessage({
        type: "TRANSCRIPT_TURN",
        payload: {
          speaker: "ai",
          text: "I only have context for this site right now. Check the web dashboard for a full comparison.",
          timestamp: Date.now(),
          mode: "query",
        },
      });
    }
  }

  function start() {
    if (interval) return;
    interval = setInterval(() => {
      options.onMessage({ type: "PONG" });
    }, 30000);
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  return { handleClient, start, stop };
}
