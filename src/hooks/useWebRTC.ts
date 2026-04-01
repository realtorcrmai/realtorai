"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "error";
type NetworkQuality = 0 | 1 | 2 | 3 | 4 | 5;

interface UseWebRTCReturn {
  state: ConnectionState;
  networkQuality: NetworkQuality;
  isMuted: boolean;
  join: (roomUrl: string, token: string) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  getAudioTrack: () => MediaStreamTrack | null;
}

export function useWebRTC(): UseWebRTCReturn {
  const [state, setState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(5);
  const [isMuted, setIsMuted] = useState(false);
  const callRef = useRef<ReturnType<typeof import("@daily-co/daily-js").default.createCallObject> | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);

  const join = useCallback(async (roomUrl: string, token: string) => {
    setState("connecting");

    try {
      // Dynamic import to avoid SSR issues
      const DailyIframe = (await import("@daily-co/daily-js")).default;

      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });

      callObject.on("joined-meeting", () => {
        setState("connected");
      });

      callObject.on("left-meeting", () => {
        setState("disconnected");
        audioTrackRef.current = null;
      });

      callObject.on("error", () => {
        setState("error");
      });

      callObject.on("network-quality-change", (event: { threshold: string }) => {
        const qualityMap: Record<string, NetworkQuality> = {
          good: 5,
          low: 3,
          "very-low": 1,
        };
        setNetworkQuality(qualityMap[event.threshold] ?? 3);
      });

      callObject.on("track-started", (event) => {
        if (event.participant?.local && event.track?.kind === "audio") {
          audioTrackRef.current = event.track;
        }
      });

      await callObject.join({
        url: roomUrl,
        token,
        startVideoOff: true,
        startAudioOff: false,
      });

      callRef.current = callObject;
    } catch {
      setState("error");
    }
  }, []);

  const leave = useCallback(async () => {
    if (callRef.current) {
      await callRef.current.leave();
      callRef.current.destroy();
      callRef.current = null;
    }
    audioTrackRef.current = null;
    setState("idle");
    setNetworkQuality(5);
  }, []);

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const newMuted = !isMuted;
      callRef.current.setLocalAudio(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const getAudioTrack = useCallback(() => audioTrackRef.current, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, []);

  return { state, networkQuality, isMuted, join, leave, toggleMute, getAudioTrack };
}
