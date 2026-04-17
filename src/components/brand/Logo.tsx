/**
 * Realtors360 Brand Logo Components
 *
 * Usage:
 *   <LogoIcon size={32} />              — Just the icon (sidebar, favicon)
 *   <LogoMark size={32} />              — Icon + "Realtors360" text
 *   <LogoAnimated size={200} />         — Full animated 3D logo (login/splash)
 *   <LogoSpinner size={32} />           — Spinning circle (loading indicator)
 *   <LogoVideo size={36} />             — Looping MP4 video logo (sidebar, nav)
 */

import { cn } from "@/lib/utils";

// ── Brand colors ──
const GOLD = "#C9A96E";
const NAVY = "#2D3E50";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Static icon — roofline + circle arc
 * Use in: sidebar, mobile nav, small UI elements
 */
export function LogoIcon({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="Realtors360 logo"
    >
      {/* 330° arc with gap */}
      <path
        d="M32 4 A28 28 0 1 1 18.6 7.5"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Roofline */}
      <path
        d="M18 40L32 22L46 40"
        stroke={NAVY}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door/pillar */}
      <line x1="32" y1="40" x2="32" y2="50" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="50" x2="42" y2="50" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Icon with dark background (for sidebar)
 */
export function LogoIconDark({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="Realtors360 logo"
    >
      {/* 330° arc with gap */}
      <path
        d="M32 4 A28 28 0 1 1 18.6 7.5"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Roofline */}
      <path
        d="M18 40L32 22L46 40"
        stroke={GOLD}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door/pillar */}
      <line x1="32" y1="40" x2="32" y2="50" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="50" x2="42" y2="50" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Logo mark — icon + wordmark
 * Use in: login page header, about sections
 */
export function LogoMark({ size = 32, className }: LogoProps & { variant?: "light" | "dark" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoIcon size={size} />
      <span
        className="font-bold tracking-tight"
        style={{ fontSize: size * 0.5 }}
      >
        Realtors360
      </span>
    </div>
  );
}

/**
 * Spinning circle — loading indicator
 * Use in: LoadingSpinner, skeleton screens
 */
export function LogoSpinner({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={cn("animate-spin", className)}
      aria-label="Loading"
    >
      <path
        d="M32 4 A28 28 0 1 1 18.6 7.5"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M32 4 A28 28 0 0 1 56 20"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Live animated logo — embeds the full 3D animated HTML as a scaled iframe
 * Use in: sidebar, nav bar, header — anywhere you want the live revolving logo
 *
 * Uses logo-sidebar.html (120px native) for sizes ≤ 100px → no shield, just gold icon
 * Uses logo-animated.html (420px native) for sizes > 100px → full 3D shield with effects
 */
export function LogoVideo({ size = 40, className }: LogoProps) {
  const isSmall = size <= 100;
  const nativeSize = isSmall ? 120 : 420;
  const src = isSmall ? "/logo-sidebar.html" : "/logo-animated.html";
  const scale = size / nativeSize;

  return (
    <div
      className={cn("overflow-hidden shrink-0", className)}
      style={{
        width: size,
        height: size,
        borderRadius: isSmall ? 0 : size * 0.22,
      }}
      aria-label="Realtors360 logo"
    >
      <iframe
        src={src}
        title="Realtors360 animated logo"
        style={{
          width: nativeSize,
          height: nativeSize,
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

/**
 * Full animated logo — 3D floating shield with revolving effects
 * Use in: login page, splash screen, marketing
 */
export function LogoAnimated({ size = 380, className }: LogoProps) {
  const scale = size / 400;

  return (
    <div
      className={cn("relative", className)}
      style={{
        width: size,
        height: size,
        perspective: "800px",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes r360-entrance {
          from { opacity: 0; transform: translateY(80px) rotateX(30deg) scale(0.6); }
          to { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
        }
        @keyframes r360-float {
          0%, 100% { transform: translateY(0) rotateX(2deg) rotateY(0deg); }
          25% { transform: translateY(-12px) rotateX(0deg) rotateY(3deg); }
          50% { transform: translateY(-6px) rotateX(-2deg) rotateY(0deg); }
          75% { transform: translateY(-14px) rotateX(0deg) rotateY(-3deg); }
        }
        @keyframes r360-revolve {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes r360-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes r360-spin-rev {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes r360-door {
          to { opacity: 0.2; }
        }
        @keyframes r360-draw-stroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes r360-sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          40% { opacity: 0.9; transform: scale(1.8); }
          60% { opacity: 0.5; transform: scale(1); }
        }
        .r360-scene {
          width: 100%; height: 100%;
          transform-style: preserve-3d;
          animation: r360-entrance 1.6s cubic-bezier(0.16,1,0.3,1) both,
                     r360-float 6s ease-in-out 1.6s infinite;
        }
        .r360-shield {
          position: absolute; inset: ${20 * scale}px;
          border-radius: ${36 * scale}px;
          background: linear-gradient(155deg, #2e4258 0%, #1c2d40 40%, #162536 100%);
          box-shadow: 0 ${30 * scale}px ${80 * scale}px rgba(0,0,0,0.6),
                      0 0 ${60 * scale}px rgba(201,169,110,0.04),
                      inset 0 1px 0 rgba(255,255,255,0.06),
                      inset 0 -2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          transform-style: preserve-3d;
        }
        .r360-shield::before {
          content: ''; position: absolute;
          top: 8px; left: 8px; right: 40%; bottom: 55%;
          border-radius: ${32 * scale}px ${32 * scale}px ${80 * scale}px ${20 * scale}px;
          background: linear-gradient(155deg, rgba(255,255,255,0.07) 0%, transparent 100%);
          pointer-events: none;
        }
        .r360-glare {
          position: absolute; inset: -2px;
          border-radius: ${38 * scale}px;
          overflow: hidden; pointer-events: none;
        }
        .r360-glare::before {
          content: ''; position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: conic-gradient(from 0deg, transparent 0deg, transparent 260deg,
            rgba(201,169,110,0.35) 290deg, rgba(255,255,255,0.15) 310deg,
            rgba(201,169,110,0.35) 330deg, transparent 360deg);
          animation: r360-revolve 4s linear infinite;
        }
        .r360-inner-mask {
          position: absolute; inset: 2px;
          border-radius: ${34 * scale}px;
          background: linear-gradient(155deg, #2e4258 0%, #1c2d40 40%, #162536 100%);
          pointer-events: none;
        }
        .r360-circle-group {
          transform-box: fill-box;
          transform-origin: center;
          animation: r360-spin-rev 6s linear 3s infinite;
        }
        .r360-circle {
          stroke-dasharray: 220 82;
          stroke-dashoffset: 302;
          animation: r360-draw 2.5s ease-out 1s forwards;
          filter: drop-shadow(0 0 8px rgba(201,169,110,0.5));
        }
        .r360-roof {
          stroke-dasharray: 200; stroke-dashoffset: 200;
          animation: r360-draw-stroke 1.5s ease-out 0.6s forwards;
          filter: drop-shadow(0 0 3px rgba(201,169,110,0.2));
        }
        .r360-pillar {
          stroke-dasharray: 50; stroke-dashoffset: 50;
          animation: r360-draw-stroke 0.8s ease-out 1.6s forwards;
        }
        .r360-base {
          stroke-dasharray: 100; stroke-dashoffset: 100;
          animation: r360-draw-stroke 0.6s ease-out 2s forwards;
        }
        .r360-door {
          opacity: 0;
          animation: r360-door 0.8s ease-out 2.2s forwards;
        }
        .r360-sparkle {
          position: absolute; z-index: 3;
          width: 5px; height: 5px;
          background: #c9a96e; border-radius: 50%;
          opacity: 0; filter: blur(0.5px);
          animation: r360-sparkle 4s ease-in-out infinite;
        }
        .r360-shadow {
          position: absolute; bottom: -8px; left: 50%;
          transform: translateX(-50%);
          width: ${180 * scale}px; height: ${24 * scale}px;
          background: radial-gradient(ellipse, rgba(201,169,110,0.10) 0%, transparent 70%);
          border-radius: 50%;
          animation: r360-entrance 1.6s cubic-bezier(0.16,1,0.3,1) both;
        }
      `,
        }}
      />
      <div className="r360-scene">
        <div className="r360-shield">
          <div className="r360-glare" />
          <div className="r360-inner-mask" />
          <div className="r360-sparkle" style={{ top: "20%", left: "28%", animationDelay: "1.5s" }} />
          <div className="r360-sparkle" style={{ top: "50%", right: "22%", animationDelay: "3s" }} />
          <div className="r360-sparkle" style={{ top: "70%", left: "35%", animationDelay: "5s", width: 3, height: 3 }} />
          <svg
            viewBox="0 0 120 120"
            fill="none"
            style={{ position: "relative", zIndex: 2, width: "65%", height: "65%" }}
          >
            <g className="r360-circle-group">
              <circle
                className="r360-circle"
                cx="60" cy="52" r="46"
                stroke="#C9A96E" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85"
              />
            </g>
            <path className="r360-roof" d="M30 62L60 30L90 62" stroke="#C9A96E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line className="r360-pillar" x1="42" y1="54" x2="42" y2="72" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" />
            <line className="r360-pillar" x1="78" y1="54" x2="78" y2="72" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" />
            <line className="r360-base" x1="36" y1="72" x2="84" y2="72" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" />
            <rect className="r360-door" x="52" y="58" width="16" height="14" rx="2" fill="#C9A96E" />
          </svg>
        </div>
        <div className="r360-shadow" />
      </div>
    </div>
  );
}
