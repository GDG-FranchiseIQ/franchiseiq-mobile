import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { createProject } from "@/lib/api";
import { useFieldStore } from "@/store/useFieldStore";

export default function ProjectGateScreen() {
  const {
    projectId,
    projectName,
    businessObjective,
    setProject,
    clearProject,
  } = useFieldStore();

  const [name, setName] = useState(projectName || "");
  const [objective, setObjective] = useState(businessObjective || "");
  const [busy, setBusy] = useState(false);

  const sitesCount = useFieldStore((s) => s.sites.length);

  async function onStartProject() {
    if (!name.trim() || !objective.trim()) return;
    setBusy(true);
    try {
      const { project_id } = await createProject(name.trim(), objective.trim());
      setProject({ id: project_id, name: name.trim(), objective: objective.trim() });
      router.replace("/session");
    } catch (e) {
      Alert.alert("Could not start project", String(e));
    } finally {
      setBusy(false);
    }
  }

  function onNewProject() {
    Alert.alert(
      "Start a new project?",
      "Starting a new project will clear your current session on this device. Your data is saved to the web dashboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            clearProject();
            setName("");
            setObjective("");
          },
        },
      ]
    );
  }

  if (projectId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.kicker}>ACTIVE PROJECT</Text>
          <Text style={styles.title}>{projectName}</Text>
          <Text style={styles.meta}>
            {sitesCount} site{sitesCount === 1 ? "" : "s"} surveyed this session
          </Text>
          <Pressable
            style={[styles.primary, busy && styles.disabled]}
            onPress={() => router.push("/session")}
            disabled={busy}
          >
            <Text style={styles.primaryText}>Continue Survey</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={onNewProject} disabled={busy}>
            <Text style={styles.linkText}>New Project</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.kicker}>FRANCHISEIQ FIELD</Text>
          <Text style={styles.headline}>Create a project</Text>
          <Text style={styles.label}>Project name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Brooklyn Fast Casual Q2"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Business objective</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Concept, budget, demographics…"
            placeholderTextColor="#64748b"
            value={objective}
            onChangeText={setObjective}
            multiline
          />
          <Pressable
            style={[styles.primary, busy && styles.disabled]}
            onPress={onStartProject}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#0c1220" />
            ) : (
              <Text style={styles.primaryText}>Start Project</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a1628" },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, justifyContent: "center" },
  kicker: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: { color: "#f8fafc", fontSize: 26, fontWeight: "700", marginBottom: 8 },
  headline: { color: "#94a3b8", fontSize: 16, marginBottom: 20 },
  meta: { color: "#94a3b8", fontSize: 15, marginBottom: 28 },
  label: { color: "#64748b", fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#111c2f",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#e2e8f0",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  primary: {
    backgroundColor: "#38bdf8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  primaryText: { color: "#0c1220", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.6 },
  link: { marginTop: 20, alignItems: "center", padding: 8 },
  linkText: { color: "#94a3b8", fontSize: 15, textDecorationLine: "underline" },
});
