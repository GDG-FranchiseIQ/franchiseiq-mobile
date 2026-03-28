import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NotFound() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Screen not found</Text>
      <Link href="/" style={styles.link}>
        Go to project gate
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a1628", padding: 24 },
  title: { color: "#e2e8f0", fontSize: 18, marginBottom: 16 },
  link: { color: "#38bdf8", fontSize: 16, fontWeight: "700" },
});
