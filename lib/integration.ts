/**
 * End-to-end checklist (mock WebSocket: EXPO_PUBLIC_USE_MOCK=true or omit API URLs):
 * 1. Project Gate → create project → Session Home (session starts via API or local id).
 * 2. Survey New Site → camera + GPS frames + AUDIO_IN chunks → SCORE_UPDATE / FINDING.
 * 3. Pin → SITE_PINNED toast; Close → SITE_CLOSED → site locked on Session Home.
 * 4. End Session → Session End → deep link to web dashboard.
 * 5. QR scan → session id applied → Session Home.
 *
 * With real Cloud Run: set EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_WS_BASE_URL, EXPO_PUBLIC_USE_MOCK=false,
 * Firebase config, and align COMMAND / audio codec with FastAPI implementation.
 */
export const INTEGRATION_CHECKLIST = [
  "Project → session → survey → lock site",
  "Mock WS score + findings + transcript",
  "Session end deep link",
  "QR session link",
] as const;
