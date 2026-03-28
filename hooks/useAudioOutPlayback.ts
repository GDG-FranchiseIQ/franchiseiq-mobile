import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import type { AudioOutPayload } from "@/lib/types";

type UseAudioOutPlaybackOptions = {
  onSpeakingChange?: (speaking: boolean) => void;
  enabled?: boolean;
};

export function useAudioOutPlayback({
  onSpeakingChange,
  enabled = true,
}: UseAudioOutPlaybackOptions = {}) {
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const activeUriRef = useRef<string | null>(null);

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        if (!enabled) break;
        const uri = queueRef.current.shift();
        if (!uri) continue;
        activeUriRef.current = uri;
        onSpeakingChange?.(true);
        const sound = new Audio.Sound();
        activeSoundRef.current = sound;
        await sound.loadAsync({ uri });
        await sound.playAsync();
        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded || status.didJustFinish) resolve();
          });
        });
        await sound.unloadAsync();
        activeSoundRef.current = null;
        onSpeakingChange?.(false);
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        activeUriRef.current = null;
      }
    } finally {
      processingRef.current = false;
    }
  }, [enabled, onSpeakingChange]);

  const enqueueAudio = useCallback(
    async (payload: AudioOutPayload) => {
      if (!enabled) return;
      if (!payload?.pcm_base64) return;
      const ext = payload.audio_format?.includes("mpeg") ? "mp3" : "m4a";
      const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}tts-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;
      await FileSystem.writeAsStringAsync(uri, payload.pcm_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      queueRef.current.push(uri);
      void drainQueue();
    },
    [drainQueue, enabled]
  );

  useEffect(() => {
    if (enabled) return;
    const sound = activeSoundRef.current;
    if (sound) {
      void sound.stopAsync().catch(() => {});
      void sound.unloadAsync().catch(() => {});
      activeSoundRef.current = null;
    }
    const active = activeUriRef.current;
    if (active) {
      void FileSystem.deleteAsync(active, { idempotent: true }).catch(() => {});
      activeUriRef.current = null;
    }
    for (const uri of queueRef.current) {
      void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
    queueRef.current = [];
    onSpeakingChange?.(false);
  }, [enabled, onSpeakingChange]);

  useEffect(() => {
    return () => {
      const sound = activeSoundRef.current;
      if (sound) {
        void sound.unloadAsync().catch(() => {});
      }
      const active = activeUriRef.current;
      if (active) {
        void FileSystem.deleteAsync(active, { idempotent: true }).catch(() => {});
      }
      for (const uri of queueRef.current) {
        void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      queueRef.current = [];
      onSpeakingChange?.(false);
    };
  }, [onSpeakingChange]);

  return { enqueueAudio };
}
