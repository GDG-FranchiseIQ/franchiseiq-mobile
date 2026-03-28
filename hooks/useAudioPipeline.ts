import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { uint8ToBase64 } from "@/lib/base64";

type AudioPipelineOptions = {
  enabled: boolean;
  onPcmChunk: (pcmBase64: string, timestamp: string) => void;
};

/**
 * Captures microphone audio continuously and streams incremental encoded chunks.
 * Expo AV records AAC/M4A; this hook sends encoded byte slices as transport payloads.
 */
export function useAudioPipeline({ enabled, onPcmChunk }: AudioPipelineOptions) {
  const [metering, setMetering] = useState(-160);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotateInFlightRef = useRef(false);
  const onPcmRef = useRef(onPcmChunk);
  onPcmRef.current = onPcmChunk;

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
    })();
  }, []);

  const cleanup = useCallback(async () => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    rotateInFlightRef.current = false;
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
      } catch {
        /* */
      }
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !permissionGranted) {
      void cleanup();
      return;
    }

    let cancelled = false;

    const startNewRecording = async () => {
      const rec = new Audio.Recording();
      try {
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
        recordingRef.current = rec;
      } catch {
        recordingRef.current = null;
      }
    };

    const rotateRecording = async () => {
      if (rotateInFlightRef.current) return;
      const current = recordingRef.current;
      if (!current) return;
      rotateInFlightRef.current = true;
      try {
        await current.stopAndUnloadAsync();
        const uri = current.getURI();
        recordingRef.current = null;
        if (uri) {
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (base64.length > 0) {
              onPcmRef.current(base64, new Date().toISOString());
            }
          } catch {
            // Fallback to tiny non-silent metering payload to keep transport alive.
            const level = Math.max(0, Math.min(255, Math.round((metering + 160) * 1.6)));
            const sample = new Uint8Array([level, 0, level, 0, level, 0, level, 0]);
            onPcmRef.current(uint8ToBase64(sample), new Date().toISOString());
          }
          void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
        await startNewRecording();
      } catch {
        await startNewRecording();
      } finally {
        rotateInFlightRef.current = false;
      }
    };

    (async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      await startNewRecording();
      const rec = recordingRef.current;
      if (!rec) return;
      if (cancelled) {
        await rec.stopAndUnloadAsync().catch(() => {});
        return;
      }

      chunkTimerRef.current = setInterval(async () => {
        const r = recordingRef.current;
        if (!r) return;
        try {
          const status = await r.getStatusAsync();
          if (status.isRecording && status.metering != null) {
            setMetering(status.metering);
          }
        } catch {
          /* */
        }
        await rotateRecording();
      }, 2500);
    })();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [enabled, permissionGranted, cleanup]);

  return { metering, permissionGranted };
}
