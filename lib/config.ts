import Constants from "expo-constants";

type Extra = {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
  webDashboardUrl?: string;
  useMockWs?: boolean;
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
};

export function getExtra(): Extra {
  return (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Extra;
}

export function getApiBaseUrl(): string {
  return getExtra().apiBaseUrl ?? "";
}

export function getWsBaseUrl(): string {
  return getExtra().wsBaseUrl ?? "";
}

export function getWebDashboardUrl(): string {
  return getExtra().webDashboardUrl ?? "https://example.com";
}

export function useMockWebSocket(): boolean {
  return getExtra().useMockWs !== false;
}

export function hasFirebaseConfig(): boolean {
  const f = getExtra().firebase;
  return Boolean(f?.apiKey && f?.projectId);
}
