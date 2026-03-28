import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { uint8ToBase64 } from "@/lib/base64";

type AudioPipelineOptions = {
  enabled: boolean;
  onPcmChunk: (pcmBase64: string, timestamp: number) => void;
};

/** Records with metering for UI; sends PCM-sized chunks (placeholder bytes) for WebSocket AUDIO_IN until backend defines exact codec. */
export function useAudioPipeline({ enabled, onPcmChunk }: AudioPipelineOptions) {
  const [metering, setMetering] = useState(-160);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    (async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const rec = new Audio.Recording();
      try {
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
      } catch {
        return;
      }
      if (cancelled) {
        await rec.stopAndUnloadAsync().catch(() => {});
        return;
      }
      recordingRef.current = rec;

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
        const silence = new Uint8Array(320);
        onPcmRef.current(uint8ToBase64(silence), Date.now());
      }, 400);
    })();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [enabled, permissionGranted, cleanup]);

  return { metering, permissionGranted };
}
