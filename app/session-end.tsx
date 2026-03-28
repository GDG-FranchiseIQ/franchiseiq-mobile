import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getWebDashboardUrl } from "@/lib/config";
import { useFieldStore } from "@/store/useFieldStore";
import * as Linking from "expo-linking";

export default function SessionEndScreen() {
  const projectName = useFieldStore((s) => s.projectName);
  const sites = useFieldStore((s) => s.sites);
  const projectId = useFieldStore((s) => s.projectId);
  const high = useFieldStore((s) => s.sessionEndHigh);
  const low = useFieldStore((s) => s.sessionEndLow);
  const resetSession = useFieldStore((s) => s.resetSession);

  const locked = sites.filter((s) => s.status === "locked");

  function openWeb() {
    const base = getWebDashboardUrl().replace(/\/$/, "");
    const url = `${base}/dashboard?project=${encodeURIComponent(projectId ?? "")}`;
    Linking.openURL(url).catch(() => {});
  }

  function anotherSession() {
    resetSession();
    router.replace("/session");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.kicker}>SESSION COMPLETE</Text>
      <Text style={styles.title}>{projectName}</Text>
      <Text style={styles.meta}>
        {locked.length} site{locked.length === 1 ? "" : "s"} surveyed
      </Text>

      {high ? (
        <View style={styles.row}>
          <Text style={styles.label}>Highest score</Text>
          <Text style={styles.val}>
            {high.address} — {Math.round(high.score)}
          </Text>
        </View>
      ) : null}
      {low ? (
        <View style={styles.row}>
          <Text style={styles.label}>Lowest score</Text>
          <Text style={styles.val}>
            {low.address} — {Math.round(low.score)}
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.primary} onPress={openWeb}>
        <Text style={styles.primaryText}>View Full Analysis on Web</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={anotherSession}>
        <Text style={styles.linkText}>Survey Another Session</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a1628", paddingHorizontal: 16, paddingTop: 8 },
  kicker: { color: "#38bdf8", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#f8fafc", fontSize: 26, fontWeight: "700", marginTop: 8 },
  meta: { color: "#94a3b8", fontSize: 15, marginBottom: 20 },
  row: { marginBottom: 12 },
  label: { color: "#64748b", fontSize: 12 },
  val: { color: "#e2e8f0", fontSize: 16, marginTop: 4 },
  primary: {
    backgroundColor: "#38bdf8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#0c1220", fontWeight: "800", fontSize: 16 },
  link: { marginTop: 16, alignItems: "center", padding: 8 },
  linkText: { color: "#94a3b8", fontSize: 15, textDecorationLine: "underline" },
});
