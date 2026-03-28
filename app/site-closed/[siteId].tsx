import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { getWebDashboardUrl } from "@/lib/config";
import { useFieldStore } from "@/store/useFieldStore";
import * as Linking from "expo-linking";

export default function SiteClosedScreen() {
  const { siteId: rawId } = useLocalSearchParams<{ siteId: string }>();
  const siteId = decodeURIComponent(rawId ?? "");
  const sites = useFieldStore((s) => s.sites);
  const projectId = useFieldStore((s) => s.projectId);

  const site = sites.find((s) => s.id === siteId);

  function openWeb() {
    const base = getWebDashboardUrl().replace(/\/$/, "");
    const url = `${base}/dashboard?project=${encodeURIComponent(projectId ?? "")}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.kicker}>SITE LOCKED</Text>
        <Text style={styles.title}>Site {site?.sequenceNum ?? "—"}</Text>
        <Text style={styles.addr}>{site?.addressStub ?? "Unknown address"}</Text>
        <Text style={styles.score}>
          Composite: {site?.compositeScore != null ? Math.round(site.compositeScore) : "—"}
        </Text>
        <Text style={styles.note}>
          Full analysis available on the web dashboard.
        </Text>
        <Pressable style={styles.btn} onPress={openWeb}>
          <Text style={styles.btnText}>Open web dashboard</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => router.replace("/session")}>
          <Text style={styles.backText}>Back to session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a1628", justifyContent: "center", padding: 16 },
  card: {
    backgroundColor: "#111c2f",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  kicker: { color: "#94a3b8", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#f8fafc", fontSize: 22, fontWeight: "700", marginTop: 8 },
  addr: { color: "#cbd5e1", fontSize: 15, marginTop: 8 },
  score: { color: "#38bdf8", fontSize: 18, fontWeight: "800", marginTop: 12 },
  note: { color: "#94a3b8", fontSize: 14, lineHeight: 20, marginTop: 16 },
  btn: {
    marginTop: 20,
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#0c1220", fontWeight: "800" },
  back: { marginTop: 12, alignItems: "center", padding: 8 },
  backText: { color: "#94a3b8" },
});
