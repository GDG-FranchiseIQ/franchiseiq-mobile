import { getWsBaseUrl } from "./config";
import { useMockWebSocket } from "./config";
import { getIdTokenForBackend } from "./firebase";
import { createMockWsHandlers } from "./mockWs";
import type { ClientMessage, ServerMessage } from "./types";

export type SessionWsCallbacks = {
  onServerMessage: (msg: ServerMessage) => void;
  onConnectionChange: (connected: boolean) => void;
};

const RECONNECT_MS = [200, 400, 800, 1600, 3200];

function buildWebSocketUrl(baseRaw: string, sessionId: string, token: string): string {
  const base = baseRaw.replace(/\/$/, "");
  if (base.startsWith("ws://") || base.startsWith("wss://")) {
    return `${base}/ws/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
  }
  const proto = base.startsWith("https") ? "wss" : "ws";
  const hostPath = base.replace(/^https?:\/\//, "");
  return `${proto}://${hostPath}/ws/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
}

export class SessionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  private mock: ReturnType<typeof createMockWsHandlers> | null = null;

  constructor(
    private sessionId: string,
    private siteId: string,
    private callbacks: SessionWsCallbacks
  ) {}

  connect() {
    this.closedByUser = false;
    if (useMockWebSocket() || !getWsBaseUrl()) {
      this.connectMock();
      return;
    }
    this.connectReal();
  }

  private connectMock() {
    this.callbacks.onConnectionChange(true);
    this.mock = createMockWsHandlers({
      siteId: this.siteId,
      onMessage: (m) => this.callbacks.onServerMessage(m),
    });
    this.mock.start();
  }

  private async connectReal() {
    const base = getWsBaseUrl();
    const token = await getIdTokenForBackend();
    const wsUrl = buildWebSocketUrl(base, this.sessionId, token);

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.callbacks.onConnectionChange(true);
      };
      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as ServerMessage;
          this.callbacks.onServerMessage(data);
        } catch {
          /* binary or ping */
        }
      };
      this.ws.onerror = () => {
        this.callbacks.onConnectionChange(false);
      };
      this.ws.onclose = () => {
        this.callbacks.onConnectionChange(false);
        if (!this.closedByUser) this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    const delay = RECONNECT_MS[Math.min(this.reconnectAttempt, RECONNECT_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connectReal(), delay);
  }

  send(message: ClientMessage) {
    if (this.mock) {
      this.mock.handleClient(message);
      return;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.mock?.stop();
    this.mock = null;
    this.ws?.close();
    this.ws = null;
    this.callbacks.onConnectionChange(false);
  }
}
