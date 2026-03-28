import { useCallback, useEffect, type RefObject } from "react";
import * as Location from "expo-location";
import type { CameraView } from "expo-camera";

const FRAME_INTERVAL_MS = 3000;

type FramePayload = {
  image_base64: string;
  lat: number;
  lng: number;
  accuracy_m?: number;
  timestamp: number;
};

export function useFrameCapture(
  cameraRef: RefObject<CameraView | null>,
  enabled: boolean,
  onFrame: (payload: FramePayload) => void
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const captureOnce = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam) return;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const photo = await cam.takePictureAsync({
        base64: true,
        quality: 0.35,
        skipProcessing: true,
      });
      if (!photo?.base64) return;
      onFrame({
        image_base64: photo.base64,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy_m: loc.coords.accuracy ?? undefined,
        timestamp: Date.now(),
      });
    } catch {
      /* camera busy or permission */
    }
  }, [cameraRef, onFrame]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    captureOnce();
    timerRef.current = setInterval(captureOnce, FRAME_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, captureOnce]);
}
