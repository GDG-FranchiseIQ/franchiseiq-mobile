import { getApiBaseUrl } from "./config";
import { getIdTokenForBackend } from "./firebase";
import type { CreateProjectResponse, StartSessionResponse } from "./types";

const DEFAULT_TIMEOUT_MS = 20_000;

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdTokenForBackend();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const hint = text ? `: ${text.slice(0, 240)}` : "";
      throw new Error(`HTTP ${res.status}${hint}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "Request timed out. On a physical phone, set EXPO_PUBLIC_API_BASE_URL to your computer's LAN IP (not localhost), same Wi‑Fi, and ensure the API is running (try /healthz in the phone browser)."
      );
    }
    if (e instanceof TypeError) {
      throw new Error(
        "Network request failed. Check Wi‑Fi, firewall, and that EXPO_PUBLIC_API_BASE_URL matches a reachable host."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function createProject(
  name: string,
  objective: string
): Promise<CreateProjectResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    const id = `proj_${Date.now().toString(36)}`;
    return { project_id: id };
  }
  const data = await fetchJson<CreateProjectResponse>(
    `${base.replace(/\/$/, "")}/api/v1/projects`,
    {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ name, objective }),
    }
  );
  return data;
}

export async function startSession(projectId: string): Promise<StartSessionResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    return { session_id: `sess_${Date.now().toString(36)}` };
  }
  return fetchJson<StartSessionResponse>(
    `${base.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(projectId)}/sessions`,
    {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    }
  );
}
