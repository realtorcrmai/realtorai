/**
 * Magnate Wordmark — 3D animated gold wordmark with L→R glare sweep
 *
 * Usage:
 *   <MagnateWordmark width={520} />                     — animated (default)
 *   <MagnateWordmark width={520} variant="light" />     — light background variant
 *   <MagnateWordmark width={520} variant="static" />    — flat SVG (no animation)
 *
 * Sources served from /public/:
 *   /magnate-animated.html        — dark bg, full 3D animation
 *   /magnate-animated-light.html  — light bg variant
 *   /magnate-static.svg            — flat SVG (email, PDF, favicon contexts)
 */

import { cn } from "@/lib/utils";

// Native dimensions of the HTML scenes (matches the .scene div in each HTML file)
const NATIVE_WIDTH = 720;
const NATIVE_HEIGHT = 360;

interface MagnateWordmarkProps {
  width?: number;
  className?: string;
  variant?: "dark" | "light" | "static";
}

export function MagnateWordmark({
  width = 520,
  className,
  variant = "dark",
}: MagnateWordmarkProps) {
  const scale = width / NATIVE_WIDTH;
  const height = Math.round(NATIVE_HEIGHT * scale);

  if (variant === "static") {
    return (
      <img
        src="/magnate-static.svg"
        alt="Magnate"
        width={width}
        height={Math.round((width * 240) / 720)}
        className={cn("block", className)}
      />
    );
  }

  const src =
    variant === "light" ? "/magnate-animated-light.html" : "/magnate-animated.html";

  return (
    <div
      className={cn("overflow-hidden shrink-0", className)}
      style={{ width, height }}
      aria-label="Magnate wordmark"
      role="img"
    >
      <iframe
        src={src}
        title="Magnate animated wordmark"
        style={{
          width: NATIVE_WIDTH,
          height: NATIVE_HEIGHT,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          display: "block",
        }}
        tabIndex={-1}
        loading="eager"
      />
    </div>
  );
}
