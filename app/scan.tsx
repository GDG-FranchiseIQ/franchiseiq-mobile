import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { useFieldStore } from "@/store/useFieldStore";

/** Parse QR: URL with project_id, session_id query params or franchiseiq:// scheme */
function parseSessionLink(raw: string): { projectId?: string; sessionId?: string } {
  try {
    const parsed = Linking.parse(raw);
    const q = parsed.queryParams ?? {};
    const projectId =
      (q.project_id as string) ||
      (q.projectId as string) ||
      (q.project as string) ||
      undefined;
    const sessionId =
      (q.session_id as string) || (q.sessionId as string) || (q.session as string) || undefined;
    if (projectId || sessionId) return { projectId, sessionId };
  } catch {
    /* */
  }
  try {
    const j = JSON.parse(raw) as { project_id?: string; session_id?: string };
    return { projectId: j.project_id, sessionId: j.session_id };
  } catch {
    return {};
  }
}

export default function ScanScreen() {
  const [permission, request] = useCameraPermissions();
  const [last, setLast] = useState<string | null>(null);
  const setSession = useFieldStore((s) => s.setSession);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.perm}>
        <Text style={styles.permText}>Camera access is required to scan the session QR code.</Text>
        <Pressable style={styles.permBtn} onPress={request}>
          <Text style={styles.permBtnText}>Grant camera</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (last === data) return;
          setLast(data);
          const { projectId, sessionId } = parseSessionLink(data);
          if (sessionId) setSession(sessionId);
          router.replace("/session");
        }}
      />
      <SafeAreaView style={styles.hintBox}>
        <Text style={styles.hint}>Point at the QR code on the web dashboard</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Close</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  hintBox: { padding: 16 },
  hint: { color: "#e2e8f0", fontSize: 16, textAlign: "center", marginBottom: 12 },
  backBtn: { alignSelf: "center", padding: 8 },
  backBtnText: { color: "#38bdf8", fontWeight: "700" },
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
  back: { marginTop: 16, alignItems: "center" },
  backText: { color: "#94a3b8" },
});
