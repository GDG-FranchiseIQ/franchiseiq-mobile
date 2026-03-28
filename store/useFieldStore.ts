import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SiteSummary } from "@/lib/types";

const STORAGE_KEY = "franchiseiq-field-v1";

export type VoiceMode = "idle" | "listening" | "speaking";

type FieldState = {
  projectId: string | null;
  projectName: string;
  businessObjective: string;
  sessionId: string | null;
  sites: SiteSummary[];
  /** Composite score for active survey UI */
  compositeScore: number | null;
  confidence: number;
  voiceMode: VoiceMode;
  wsConnected: boolean;
  agentToast: string | null;
  queryOverlay: { user?: string; ai?: string } | null;
  lastScoreDelta: number;
  /** Session end summary */
  sessionEndHigh: { address: string; score: number } | null;
  sessionEndLow: { address: string; score: number } | null;

  setProject: (p: { id: string; name: string; objective: string }) => void;
  clearProject: () => void;
  setSession: (sessionId: string) => void;
  addSite: (site: SiteSummary) => void;
  updateSite: (id: string, patch: Partial<SiteSummary>) => void;
  lockSite: (id: string, finalScore: number) => void;
  setScores: (composite: number, confidence: number, delta: number) => void;
  setVoiceMode: (m: VoiceMode) => void;
  setWsConnected: (c: boolean) => void;
  showAgentToast: (text: string, ms?: number) => void;
  clearAgentToast: () => void;
  setQueryOverlay: (o: { user?: string; ai?: string } | null) => void;
  setSessionEndSummary: (
    high: { address: string; score: number } | null,
    low: { address: string; score: number } | null
  ) => void;
  resetSession: () => void;
};

export const useFieldStore = create<FieldState>()(
  persist(
    (set, get) => ({
      projectId: null,
      projectName: "",
      businessObjective: "",
      sessionId: null,
      sites: [],
      compositeScore: null,
      confidence: 0,
      voiceMode: "idle",
      wsConnected: false,
      agentToast: null,
      queryOverlay: null,
      lastScoreDelta: 0,
      sessionEndHigh: null,
      sessionEndLow: null,

      setProject: (p) =>
        set({
          projectId: p.id,
          projectName: p.name,
          businessObjective: p.objective,
          sessionId: null,
          sites: [],
          compositeScore: null,
          sessionEndHigh: null,
          sessionEndLow: null,
        }),

      clearProject: () =>
        set({
          projectId: null,
          projectName: "",
          businessObjective: "",
          sessionId: null,
          sites: [],
          compositeScore: null,
          sessionEndHigh: null,
          sessionEndLow: null,
        }),

      setSession: (sessionId) => set({ sessionId }),

      addSite: (site) => set((s) => ({ sites: [...s.sites, site] })),

      updateSite: (id, patch) =>
        set((s) => ({
          sites: s.sites.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      lockSite: (id, finalScore) =>
        set((s) => ({
          sites: s.sites.map((x) =>
            x.id === id
              ? { ...x, status: "locked" as const, compositeScore: finalScore }
              : x
          ),
          compositeScore: null,
        })),

      setScores: (composite, confidence, delta) =>
        set({ compositeScore: composite, confidence, lastScoreDelta: delta }),

      setVoiceMode: (m) => set({ voiceMode: m }),

      setWsConnected: (c) => set({ wsConnected: c }),

      showAgentToast: (text, ms = 2000) => {
        set({ agentToast: text });
        setTimeout(() => {
          if (get().agentToast === text) set({ agentToast: null });
        }, ms);
      },

      clearAgentToast: () => set({ agentToast: null }),

      setQueryOverlay: (o) => set({ queryOverlay: o }),

      setSessionEndSummary: (high, low) => set({ sessionEndHigh: high, sessionEndLow: low }),

      resetSession: () =>
        set({
          sessionId: null,
          sites: [],
          compositeScore: null,
          sessionEndHigh: null,
          sessionEndLow: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        projectId: s.projectId,
        projectName: s.projectName,
        businessObjective: s.businessObjective,
        sessionId: s.sessionId,
        sites: s.sites,
      }),
    }
  )
);
