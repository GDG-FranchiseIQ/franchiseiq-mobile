import { getApiBaseUrl } from "./config";
import { getIdTokenForBackend } from "./firebase";
import type { CreateProjectResponse, StartSessionResponse } from "./types";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getIdTokenForBackend();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
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
  const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/projects`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, objective }),
  });
  if (!res.ok) throw new Error(`createProject failed: ${res.status}`);
  return res.json() as Promise<CreateProjectResponse>;
}

export async function startSession(projectId: string): Promise<StartSessionResponse> {
  const base = getApiBaseUrl();
  if (!base) {
    return { session_id: `sess_${Date.now().toString(36)}` };
  }
  const res = await fetch(
    `${base.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(projectId)}/sessions`,
    {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    }
  );
  if (!res.ok) {
    // Fallback: some backends only create session on WS connect
    return { session_id: `sess_${Date.now().toString(36)}` };
  }
  return res.json() as Promise<StartSessionResponse>;
}
