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

function buildWebSocketUrl(baseRaw: string, sessionId: string, token: string, projectId: string): string {
  const base = baseRaw.replace(/\/$/, "");
  const pathPrefix = base.endsWith("/api/v1") ? "" : "/api/v1";
  if (base.startsWith("ws://") || base.startsWith("wss://")) {
    return `${base}${pathPrefix}/ws/${encodeURIComponent(sessionId)}?project_id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
  }
  const proto = base.startsWith("https") ? "wss" : "ws";
  const hostPath = base.replace(/^https?:\/\//, "");
  return `${proto}://${hostPath}${pathPrefix}/ws/${encodeURIComponent(sessionId)}?project_id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
}

export class SessionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  private mock: ReturnType<typeof createMockWsHandlers> | null = null;
  private pendingMessages: ClientMessage[] = [];

  constructor(
    private sessionId: string,
    private projectId: string,
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
    if (this.closedByUser) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const base = getWsBaseUrl();
    const token = await getIdTokenForBackend();
    const wsUrl = buildWebSocketUrl(base, this.sessionId, token, this.projectId);

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.reconnectTimer = null;
        this.callbacks.onConnectionChange(true);
        this.flushPending();
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
      this.ws.onclose = (ev) => {
        this.ws = null;
        this.callbacks.onConnectionChange(false);
        if (ev.code === 1008) {
          this.closedByUser = true;
          return;
        }
        if (!this.closedByUser) this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    if (this.reconnectTimer) return;
    const delay = RECONNECT_MS[Math.min(this.reconnectAttempt, RECONNECT_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectReal();
    }, delay);
  }

  send(message: ClientMessage) {
    if (this.mock) {
      this.mock.handleClient(message);
      return;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }
    this.pendingMessages.push(message);
    if (this.pendingMessages.length > 100) {
      this.pendingMessages.shift();
    }
  }

  private flushPending() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.pendingMessages.length > 0) {
      const next = this.pendingMessages.shift();
      if (!next) break;
      this.ws.send(JSON.stringify(next));
    }
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.mock?.stop();
    this.mock = null;
    this.ws?.close();
    this.ws = null;
    this.pendingMessages = [];
    this.callbacks.onConnectionChange(false);
  }
}
