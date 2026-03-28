import { StyleSheet, Text, View } from "react-native";

type Props = { message: string | null };

export function AgentToast({ message }: Props) {
  if (!message) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15,23,42,0.92)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.45)",
  },
  text: {
    color: "#e0f2fe",
    fontSize: 14,
    lineHeight: 20,
  },
});
