import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import { AgentToast } from "@/components/AgentToast";
import { QueryTranscript } from "@/components/QueryTranscript";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useAudioOutPlayback } from "@/hooks/useAudioOutPlayback";
import { useManualQueryRecording } from "@/hooks/useManualQueryRecording";
import { useFrameCapture } from "@/hooks/useFrameCapture";
import { useSpeechFallback } from "@/hooks/useSpeechFallback";
import { SessionWebSocket } from "@/lib/sessionWs";
import type { ServerMessage } from "@/lib/types";
import { useFieldStore } from "@/store/useFieldStore";

export default function SurveyScreen() {
  const { siteId: rawId } = useLocalSearchParams<{ siteId: string }>();
  const siteId = decodeURIComponent(rawId ?? "");

  const sessionId = useFieldStore((s) => s.sessionId);
  const projectId = useFieldStore((s) => s.projectId);
  const sites = useFieldStore((s) => s.sites);
  const compositeScore = useFieldStore((s) => s.compositeScore);
  const confidence = useFieldStore((s) => s.confidence);
  const agentToast = useFieldStore((s) => s.agentToast);
  const queryOverlay = useFieldStore((s) => s.queryOverlay);
  const voiceMode = useFieldStore((s) => s.voiceMode);
  const wsConnected = useFieldStore((s) => s.wsConnected);
  const setWsConnected = useFieldStore((s) => s.setWsConnected);
  const setVoiceMode = useFieldStore((s) => s.setVoiceMode);

  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [locReady, setLocReady] = useState(false);
  /** When false, AI TTS (AUDIO_OUT) is not played. */
  const [speakerOn, setSpeakerOn] = useState(true);
  const [queryProcessing, setQueryProcessing] = useState(false);
  const queryDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const pinFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const wsRef = useRef<SessionWebSocket | null>(null);
  const onSpeakingChange = useCallback((speaking: boolean) => {
    useFieldStore.getState().setVoiceMode(speaking ? "speaking" : "idle");
  }, []);
  const { enqueueAudio, stopAndClearQueue } = useAudioOutPlayback({
    enabled: speakerOn,
    onSpeakingChange,
  });
  const { stop } = useSpeechFallback({ enabled: speakerOn });
  const { isRecording, start: startQueryRecording, stop: stopQueryRecording, cancel: cancelQueryRecording } =
    useManualQueryRecording(Boolean(micPerm?.granted));

  const site = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const sequenceNum = site?.sequenceNum ?? 1;

  const uncertain = confidence > 0 && confidence < 0.5;

  useEffect(() => {
    if (!siteId || !sessionId) {
      router.replace("/session");
    }
  }, [siteId, sessionId]);

  useEffect(() => {
    if (site?.status === "locked") {
      router.replace(`/site-closed/${encodeURIComponent(siteId)}`);
    }
  }, [site, siteId]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocReady(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (!camPerm?.granted) requestCam();
    if (!micPerm?.granted) requestMic();
  }, [camPerm, micPerm, requestCam, requestMic]);

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      const st = useFieldStore.getState();
      switch (msg.type) {
        case "SCORE_UPDATE": {
          const p = msg.payload;
          st.setScores(p.composite_score, p.confidence, p.score_delta);
          if (Math.abs(p.score_delta) > 10) {
            st.showAgentToast(
              `${p.agent_name ?? "Agent"}: score moved ${p.score_delta > 0 ? "+" : ""}${p.score_delta.toFixed(0)}`
            );
          }
          break;
        }
        case "FINDING": {
          st.showAgentToast(`${msg.payload.agent_name}: ${msg.payload.finding_text}`);
          // Spoken output uses server TTS (AUDIO_OUT) only to avoid double voice (expo-speech vs Cloud TTS).
          break;
        }
        case "TRANSCRIPT_TURN": {
          const t = msg.payload;
          if (t.mode === "query") {
            const prev = st.queryOverlay;
            if (t.speaker === "user") {
              st.setQueryOverlay({ user: t.text, ai: prev?.ai });
            } else {
              st.setQueryOverlay({ user: prev?.user, ai: t.text });
              setQueryProcessing(false);
            }
          }
          break;
        }
        case "SITE_PINNED": {
          if (pinFallbackRef.current) {
            clearTimeout(pinFallbackRef.current);
            pinFallbackRef.current = null;
          }
          st.updateSite(siteId, { addressStub: msg.payload.address });
          st.showAgentToast("Site saved.", 1500);
          break;
        }
        case "SITE_CLOSED": {
          if (closeFallbackRef.current) {
            clearTimeout(closeFallbackRef.current);
            closeFallbackRef.current = null;
          }
          st.lockSite(siteId, msg.payload.final_composite_score);
          router.back();
          break;
        }
        case "AUDIO_OUT": {
          stop();
          void (async () => {
            await stopAndClearQueue();
            await enqueueAudio(msg.payload);
          })();
          break;
        }
        case "ERROR": {
          if (
            msg.payload.error_code === "WS_MESSAGE_PROCESSING_FAILED" ||
            msg.payload.error_code === "INVALID_WS_MESSAGE"
          ) {
            break;
          }
          setQueryProcessing(false);
          st.showAgentToast(msg.payload.message, 3000);
          break;
        }
        default:
          break;
      }
    },
    [siteId, enqueueAudio, stop, stopAndClearQueue, setQueryProcessing]
  );

  useEffect(() => {
    if (!sessionId || !projectId || !siteId) return;
    const ws = new SessionWebSocket(sessionId, projectId, siteId, {
      onServerMessage: handleServerMessage,
      onConnectionChange: setWsConnected,
    });
    wsRef.current = ws;
    ws.connect();
    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [sessionId, projectId, siteId, handleServerMessage, setWsConnected]);

  const onFrame = useCallback(
    (payload: {
      image_base64: string;
      lat: number;
      lng: number;
      accuracy_m?: number;
      timestamp: string;
    }) => {
      lastLocationRef.current = { lat: payload.lat, lng: payload.lng };
      wsRef.current?.send({
        type: "FRAME",
        payload: { ...payload, site_id: siteId },
      });
    },
    [siteId]
  );

  useFrameCapture(cameraRef, Boolean(camPerm?.granted && locReady), onFrame);

  useEffect(() => {
    return () => {
      if (queryDismissRef.current) clearTimeout(queryDismissRef.current);
      if (pinFallbackRef.current) clearTimeout(pinFallbackRef.current);
      if (closeFallbackRef.current) clearTimeout(closeFallbackRef.current);
      void cancelQueryRecording();
      stop();
    };
  }, [stop, cancelQueryRecording]);

  useEffect(() => {
    if (!speakerOn) {
      stop();
      setVoiceMode("idle");
    }
  }, [speakerOn, stop, setVoiceMode]);

  useEffect(() => {
    if (isRecording) {
      setVoiceMode("listening");
    }
  }, [isRecording, setVoiceMode]);

  async function onStartQuestion() {
    if (!wsConnected) {
      useFieldStore.getState().showAgentToast("Connect to the server first.", 2500);
      return;
    }
    if (queryProcessing) return;
    const ok = await startQueryRecording();
    if (!ok) {
      useFieldStore.getState().showAgentToast("Could not start microphone.", 2500);
    }
  }

  async function onSendQuestion() {
    if (!isRecording) {
      useFieldStore.getState().showAgentToast("Tap “Start” and speak your full question first.", 2800);
      return;
    }
    if (!wsConnected) {
      await cancelQueryRecording();
      useFieldStore.getState().showAgentToast("Not connected.", 2000);
      return;
    }
    setVoiceMode("idle");
    const base64 = await stopQueryRecording();
    if (!base64?.trim()) {
      useFieldStore.getState().showAgentToast("No audio captured. Try again.", 2500);
      return;
    }
    const loc = lastLocationRef.current;
    useFieldStore.getState().setQueryOverlay({ user: "…", ai: undefined });
    setQueryProcessing(true);
    useFieldStore.getState().showAgentToast("Question sent. Agent is researching…", 3500);
    wsRef.current?.send({
      type: "AUDIO_IN",
      payload: {
        pcm_base64: base64,
        timestamp: new Date().toISOString(),
        site_id: siteId,
        audio_format: "audio/mp4",
        is_final: true,
        ...(loc ? { lat: loc.lat, lng: loc.lng } : {}),
      },
    });
  }

  function onPin() {
    const st = useFieldStore.getState();
    const current = st.sites.find((s) => s.id === siteId);
    const fallbackAddress =
      current?.addressStub && current.addressStub !== "Location pending…"
        ? current.addressStub
        : "Pinned on device";
    if (!wsConnected) {
      st.updateSite(siteId, { addressStub: fallbackAddress });
      st.showAgentToast("Site saved locally. Waiting for sync.", 1800);
      return;
    }
    wsRef.current?.send({
      type: "COMMAND",
      payload: { action: "pin_site", site_id: siteId },
    });
    if (pinFallbackRef.current) clearTimeout(pinFallbackRef.current);
    pinFallbackRef.current = setTimeout(() => {
      const latest = useFieldStore.getState();
      const currentSite = latest.sites.find((s) => s.id === siteId);
      const alreadyPinned = currentSite?.addressStub && currentSite.addressStub !== "Location pending…";
      if (!alreadyPinned) {
        latest.updateSite(siteId, { addressStub: "Pinned on device" });
        latest.showAgentToast("Saved locally. Server ack delayed.", 2000);
      }
      pinFallbackRef.current = null;
    }, 1800);
  }

  function onClose() {
    Alert.alert(
      "Done with this site?",
      "It will be saved and locked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save & lock",
          style: "destructive",
          onPress: () => {
            if (!wsConnected) {
              useFieldStore.getState().lockSite(siteId, compositeScore ?? 0);
              useFieldStore.getState().showAgentToast("Site locked locally. Waiting for sync.", 1800);
              return;
            }
            wsRef.current?.send({
              type: "COMMAND",
              payload: { action: "close_site", site_id: siteId },
            });
            if (closeFallbackRef.current) clearTimeout(closeFallbackRef.current);
            closeFallbackRef.current = setTimeout(() => {
              const latest = useFieldStore.getState();
              const currentSite = latest.sites.find((s) => s.id === siteId);
              if (currentSite?.status !== "locked") {
                latest.lockSite(siteId, latest.compositeScore ?? 0);
                latest.showAgentToast("Locked locally. Server ack delayed.", 2000);
              }
              closeFallbackRef.current = null;
            }, 2300);
          },
        },
      ]
    );
  }

  function dismissQuery() {
    if (queryDismissRef.current) clearTimeout(queryDismissRef.current);
    queryDismissRef.current = null;
    useFieldStore.getState().setQueryOverlay(null);
  }

  if (!camPerm?.granted) {
    return (
      <SafeAreaView style={styles.perm}>
        <Text style={styles.permText}>Camera access is required for site survey.</Text>
        <Pressable style={styles.permBtn} onPress={requestCam}>
          <Text style={styles.permBtnText}>Grant camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={[styles.dim, queryOverlay ? styles.dimStrong : null]} pointerEvents="none" />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Site {sequenceNum}</Text>
            </View>
            <View style={[styles.connPill, wsConnected ? styles.connOn : styles.connOff]}>
              <Text style={styles.connText}>{wsConnected ? "Live" : "Connecting"}</Text>
            </View>
          </View>
          <ScoreBadge score={compositeScore} confidence={confidence} uncertain={uncertain} />
        </View>

        <AgentToast message={agentToast} />

        <View style={styles.queryPanel}>
          <Text style={styles.queryLabel}>
            {queryProcessing
              ? "Agent is working on your answer…"
              : isRecording
                ? "Recording — tap Send when you’re done speaking"
                : "Ask the agent (manual)"}
          </Text>
          <View style={styles.queryButtons}>
            <Pressable
              style={[
                styles.queryBtn,
                styles.queryBtnStart,
                (isRecording || queryProcessing || !wsConnected) && styles.queryBtnDisabled,
              ]}
              onPress={onStartQuestion}
              disabled={isRecording || queryProcessing || !wsConnected}
              hitSlop={6}
            >
              <Text style={styles.queryBtnText}>Start</Text>
            </Pressable>
            <Pressable
              style={[
                styles.queryBtn,
                styles.queryBtnSend,
                (!isRecording || queryProcessing || !wsConnected) && styles.queryBtnDisabled,
              ]}
              onPress={onSendQuestion}
              disabled={!isRecording || queryProcessing || !wsConnected}
              hitSlop={6}
            >
              <Text style={styles.queryBtnText}>Send</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Pressable
            style={[styles.mic, speakerOn ? styles.micOn : styles.micOff]}
            onPress={() => setSpeakerOn((v) => !v)}
            hitSlop={10}
          >
            <Text style={styles.micGlyph}>{speakerOn ? "●" : "○"}</Text>
            <Text style={styles.micHint}>
              {!speakerOn ? "AI off" : voiceMode === "speaking" ? "AI" : voiceMode === "listening" ? "Rec" : "Sound"}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onPin} hitSlop={8}>
              <Text style={styles.secondaryText}>Pin</Text>
            </Pressable>
            <Pressable style={styles.danger} onPress={onClose} hitSlop={8}>
              <Text style={styles.dangerText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {queryOverlay ? (
        <QueryTranscript user={queryOverlay.user} ai={queryOverlay.ai} onDismiss={dismissQuery} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  dimStrong: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  topLeft: { gap: 8 },
  pill: {
    backgroundColor: "rgba(15,23,42,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  pillText: { color: "#e2e8f0", fontWeight: "700", fontSize: 13 },
  connPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  connOn: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  connOff: {
    backgroundColor: "rgba(148,163,184,0.16)",
    borderColor: "rgba(148,163,184,0.4)",
  },
  connText: { color: "#e2e8f0", fontWeight: "700", fontSize: 11 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  micOn: {
    backgroundColor: "rgba(56,189,248,0.25)",
    borderColor: "#38bdf8",
  },
  micOff: {
    backgroundColor: "rgba(15,23,42,0.75)",
    borderColor: "#64748b",
  },
  micGlyph: { color: "#f8fafc", fontSize: 28 },
  micHint: { color: "#cbd5e1", fontSize: 11, marginTop: 2, fontWeight: "700" },
  actions: { alignItems: "flex-end", gap: 8 },
  secondary: {
    backgroundColor: "rgba(15,23,42,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  secondaryText: { color: "#e2e8f0", fontWeight: "700" },
  danger: {
    backgroundColor: "rgba(239,68,68,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.6)",
  },
  dangerText: { color: "#fecaca", fontWeight: "800" },
  perm: { flex: 1, backgroundColor: "#0a1628", justifyContent: "center", padding: 24 },
  permText: { color: "#e2e8f0", fontSize: 16, textAlign: "center" },
  permBtn: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#38bdf8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: { color: "#0c1220", fontWeight: "800" },
});
