import { useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";

type UseSpeechFallbackOptions = {
  enabled: boolean;
};

export function useSpeechFallback({ enabled }: UseSpeechFallbackOptions) {
  const lastSpokenAtRef = useRef(0);

  const stop = useCallback(() => {
    Speech.stop();
  }, []);

  const speak = useCallback(
    (text: string, opts?: { minGapMs?: number }) => {
      if (!enabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const now = Date.now();
      const minGapMs = opts?.minGapMs ?? 1000;
      if (now - lastSpokenAtRef.current < minGapMs) return;
      lastSpokenAtRef.current = now;
      Speech.stop();
      Speech.speak(trimmed, {
        rate: 0.98,
        pitch: 1,
      });
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      Speech.stop();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return { speak, stop };
}
