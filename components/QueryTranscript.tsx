import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  user?: string;
  ai?: string;
  onDismiss: () => void;
};

export function QueryTranscript({ user, ai, onDismiss }: Props) {
  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Pressable style={styles.panel} onPress={() => {}}>
        <Text style={styles.title}>Query</Text>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {user ? <Text style={styles.user}>{user}</Text> : null}
          {ai ? <Text style={styles.ai}>{ai}</Text> : null}
        </ScrollView>
        <Text style={styles.hint}>Tap outside to dismiss</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  panel: {
    maxHeight: "42%",
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  title: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  scroll: { flexGrow: 0 },
  user: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  ai: {
    color: "#38bdf8",
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
});
