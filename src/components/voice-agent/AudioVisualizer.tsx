"use client";

import { useEffect, useRef } from "react";

export function AudioVisualizer({
  isActive,
  height = 40,
}: {
  isActive: boolean;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = 20;
    const barWidth = canvas.width / bars;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        const barHeight = isActive
          ? Math.random() * canvas.height * 0.8 + canvas.height * 0.1
          : canvas.height * 0.1;

        ctx.fillStyle = isActive
          ? `rgba(79, 53, 210, ${0.4 + Math.random() * 0.4})`
          : "rgba(79, 53, 210, 0.15)";

        ctx.fillRect(
          i * barWidth + 1,
          canvas.height - barHeight,
          barWidth - 2,
          barHeight
        );
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={height}
      className="w-full rounded"
      aria-label={isActive ? "Audio active - visualizer showing sound levels" : "Audio inactive"}
    />
  );
}
