import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { startSession } from "@/lib/api";
import { useFieldStore } from "@/store/useFieldStore";

export default function SessionHomeScreen() {
  const projectId = useFieldStore((s) => s.projectId);
  const projectName = useFieldStore((s) => s.projectName);
  const sessionId = useFieldStore((s) => s.sessionId);
  const sites = useFieldStore((s) => s.sites);
  const setSession = useFieldStore((s) => s.setSession);
  const addSite = useFieldStore((s) => s.addSite);
  const setSessionEndSummary = useFieldStore((s) => s.setSessionEndSummary);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      router.replace("/");
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { session_id } = await startSession(projectId);
        if (!cancelled) setSession(session_id);
      } catch {
        if (!cancelled) {
          Alert.alert("Unable to start session", "Check backend connectivity and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, sessionId, setSession]);

  function surveyNewSite() {
    const id = `site_${Date.now().toString(36)}`;
    const n = sites.length + 1;
    addSite({
      id,
      sequenceNum: n,
      addressStub: "Location pending…",
      compositeScore: null,
      status: "active",
    });
    router.push(`/survey/${encodeURIComponent(id)}`);
  }

  function endSession() {
    const locked = sites.filter((s) => s.status === "locked" && s.compositeScore != null);
    if (locked.length === 0) {
      setSessionEndSummary(null, null);
      router.push("/session-end");
      return;
    }
    const sorted = [...locked].sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    setSessionEndSummary(
      { address: high.addressStub, score: high.compositeScore ?? 0 },
      { address: low.addressStub, score: low.compositeScore ?? 0 }
    );
    router.push("/session-end");
  }

  if (!projectId) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.projectName}>{projectName}</Text>
        <Pressable onPress={() => router.push("/scan")}>
          <Text style={styles.scanLink}>Link session (QR)</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.section}>Sites this session</Text>
          {sites.length === 0 ? (
            <Text style={styles.empty}>No sites yet. Start a survey.</Text>
          ) : (
            sites.map((s) => {
              const locked = s.status === "locked";
              return (
                <Pressable
                  key={s.id}
                  style={[styles.row, locked && styles.rowDimmed]}
                  onPress={() => {
                    if (locked) return;
                    router.push(`/survey/${encodeURIComponent(s.id)}`);
                  }}
                  disabled={locked}
                >
                  <Text style={styles.siteNum}>Site {s.sequenceNum}</Text>
                  <Text style={styles.addr} numberOfLines={1}>
                    {s.addressStub}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {s.compositeScore != null ? Math.round(s.compositeScore) : "—"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.primary} onPress={surveyNewSite}>
          <Text style={styles.primaryText}>Survey New Site</Text>
        </Pressable>
        <Pressable style={styles.endLink} onPress={endSession}>
          <Text style={styles.endText}>End Session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a1628" },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  projectName: { color: "#f8fafc", fontSize: 26, fontWeight: "700" },
  scanLink: { color: "#38bdf8", fontSize: 14, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  section: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  empty: { color: "#94a3b8", fontSize: 15, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111c2f",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    gap: 6,
  },
  rowDimmed: { opacity: 0.45 },
  siteNum: { color: "#94a3b8", width: 72, fontSize: 14, fontWeight: "600" },
  addr: { flex: 1, color: "#e2e8f0", fontSize: 15 },
  badge: {
    backgroundColor: "rgba(56,189,248,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 44,
    alignItems: "center",
  },
  badgeText: { color: "#38bdf8", fontWeight: "800", fontVariant: ["tabular-nums"] },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    backgroundColor: "#0a1628",
  },
  primary: {
    backgroundColor: "#38bdf8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0c1220", fontWeight: "800", fontSize: 16 },
  endLink: { marginTop: 12, alignItems: "center", padding: 8 },
  endText: { color: "#94a3b8", fontSize: 15 },
});
