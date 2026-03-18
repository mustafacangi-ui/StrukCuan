import { useEffect, useRef, useCallback } from "react";

const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN_MS = 1500;

interface ShakeDetectionOptions {
  onShake: () => void;
  enabled?: boolean;
}

/**
 * Request DeviceMotion permission (iOS 13+). Must be called from user gesture.
 */
export async function requestShakePermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const permission = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
  if (!permission) return true; // No permission needed (Android)
  try {
    const status = await permission();
    return status === "granted";
  } catch {
    return false;
  }
}

/**
 * Check if DeviceMotion is available.
 */
export function isShakeSupported(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

/**
 * Detects device shake (accelerometer) and calls onShake.
 * Only works on mobile devices with DeviceMotion API.
 */
export function useShakeDetection({ onShake, enabled = true }: ShakeDetectionOptions) {
  const lastShakeTime = useRef(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const now = Date.now();
    if (now - lastShakeTime.current < SHAKE_COOLDOWN_MS) return;

    const { x = 0, y = 0, z = 0 } = acc;
    const deltaX = Math.abs(x - lastAccel.current.x);
    const deltaY = Math.abs(y - lastAccel.current.y);
    const deltaZ = Math.abs(z - lastAccel.current.z);

    lastAccel.current = { x, y, z };

    if (deltaX > SHAKE_THRESHOLD || deltaY > SHAKE_THRESHOLD || deltaZ > SHAKE_THRESHOLD) {
      lastShakeTime.current = now;
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      onShakeRef.current();
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const hasMotion = "DeviceMotionEvent" in window;
    if (!hasMotion) return;

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [enabled, handleMotion]);
}
