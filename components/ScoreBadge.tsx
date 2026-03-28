import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type Props = {
  score: number | null;
  confidence: number;
  uncertain?: boolean;
};

function scoreColor(score: number | null): string {
  if (score == null) return "#64748b";
  if (score < 40) return "#ef4444";
  if (score < 70) return "#f59e0b";
  return "#22c55e";
}

export function ScoreBadge({ score, confidence, uncertain }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (score == null) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 160, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [score, pulse]);

  const display = uncertain ? "?" : score != null ? String(Math.round(score)) : "—";

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.badge, { borderColor: scoreColor(score), transform: [{ scale: pulse }] }]}>
        <Text style={styles.scoreText}>{display}</Text>
      </Animated.View>
      <View style={styles.ringTrack}>
        <View style={[styles.ringFill, { width: `${Math.round(confidence * 100)}%`, backgroundColor: scoreColor(score) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: "rgba(10,22,40,0.88)",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  ringTrack: {
    marginTop: 6,
    width: 76,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  ringFill: {
    height: "100%",
    borderRadius: 4,
  },
});
