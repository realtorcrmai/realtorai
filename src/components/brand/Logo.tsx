/**
 * Magnate360 Brand Logo Components
 *
 * Usage:
 *   <LogoIcon size={32} />              — Just the icon (sidebar, favicon)
 *   <LogoMark size={32} />              — Icon + "Magnate360" text
 *   <LogoAnimated size={200} />         — Full animated 3D logo (login/splash)
 *   <LogoSpinner size={32} />           — Spinning circle (loading indicator)
 *   <LogoVideo size={36} />             — Looping animated logo (sidebar, nav)
 */

import { cn } from "@/lib/utils";

// ── Brand colors ──
const GOLD = "#d4af37";
const GOLD_LIGHT = "#f0d890";
const GOLD_DARK = "#b89428";
const NAVY = "#2D3E50";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Static icon — villa with subtle M (Version B: integrated M with three roof peaks)
 * Use in: sidebar, mobile nav, small UI elements
 */
export function LogoIcon({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 140 160"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="Magnate360 logo"
    >
      <defs>
        <linearGradient id="iconGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="50%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DARK} />
        </linearGradient>
      </defs>

      {/* Left roof peak */}
      <path
        d="M20 90 L45 30 L65 80"
        stroke="url(#iconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Center roof peak (M middle) */}
      <path
        d="M65 80 L70 40 L75 80"
        stroke="url(#iconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />

      {/* Right roof peak */}
      <path
        d="M75 80 L95 30 L120 90"
        stroke="url(#iconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left chimney */}
      <rect x="32" y="20" width="7" height="28" rx="1" stroke="url(#iconGold)" strokeWidth="2" fill="none" />
      <rect x="32" y="15" width="7" height="6" rx="1" fill="url(#iconGold)" />

      {/* Right chimney */}
      <rect x="101" y="20" width="7" height="28" rx="1" stroke="url(#iconGold)" strokeWidth="2" fill="none" />
      <rect x="101" y="15" width="7" height="6" rx="1" fill="url(#iconGold)" />

      {/* Main house body */}
      <rect
        x="18"
        y="90"
        width="104"
        height="55"
        rx="2"
        stroke="url(#iconGold)"
        strokeWidth="3"
        fill="none"
      />

      {/* Door */}
      <rect
        x="62"
        y="112"
        width="16"
        height="33"
        rx="2"
        stroke="url(#iconGold)"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />

      {/* Left window */}
      <rect
        x="33"
        y="100"
        width="11"
        height="11"
        rx="1"
        stroke="url(#iconGold)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Right window */}
      <rect
        x="96"
        y="100"
        width="11"
        height="11"
        rx="1"
        stroke="url(#iconGold)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Base line */}
      <line x1="15" y1="145" x2="125" y2="145" stroke="url(#iconGold)" strokeWidth="2.5" strokeLinecap="round" />
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
      viewBox="0 0 140 160"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="Magnate360 logo"
    >
      <defs>
        <linearGradient id="darkIconGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="50%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DARK} />
        </linearGradient>
      </defs>

      {/* Left roof peak */}
      <path
        d="M20 90 L45 30 L65 80"
        stroke="url(#darkIconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Center roof peak (M middle) */}
      <path
        d="M65 80 L70 40 L75 80"
        stroke="url(#darkIconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />

      {/* Right roof peak */}
      <path
        d="M75 80 L95 30 L120 90"
        stroke="url(#darkIconGold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left chimney */}
      <rect x="32" y="20" width="7" height="28" rx="1" stroke="url(#darkIconGold)" strokeWidth="2" fill="none" />
      <rect x="32" y="15" width="7" height="6" rx="1" fill="url(#darkIconGold)" />

      {/* Right chimney */}
      <rect x="101" y="20" width="7" height="28" rx="1" stroke="url(#darkIconGold)" strokeWidth="2" fill="none" />
      <rect x="101" y="15" width="7" height="6" rx="1" fill="url(#darkIconGold)" />

      {/* Main house body */}
      <rect
        x="18"
        y="90"
        width="104"
        height="55"
        rx="2"
        stroke="url(#darkIconGold)"
        strokeWidth="3"
        fill="none"
      />

      {/* Door */}
      <rect
        x="62"
        y="112"
        width="16"
        height="33"
        rx="2"
        stroke="url(#darkIconGold)"
        strokeWidth="2"
        fill="none"
        opacity="0.7"
      />

      {/* Left window */}
      <rect
        x="33"
        y="100"
        width="11"
        height="11"
        rx="1"
        stroke="url(#darkIconGold)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Right window */}
      <rect
        x="96"
        y="100"
        width="11"
        height="11"
        rx="1"
        stroke="url(#darkIconGold)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Base line */}
      <line x1="15" y1="145" x2="125" y2="145" stroke="url(#darkIconGold)" strokeWidth="2.5" strokeLinecap="round" />
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
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.5 }}>
        Magnate360
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
 * Uses logo-sidebar.html (120px native) for sizes ≤ 100px
 * Uses logo-animated.html (420px native) for sizes > 100px
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
      aria-label="Magnate360 logo"
    >
      <iframe
        src={src}
        title="Magnate360 animated logo"
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
                      0 0 ${60 * scale}px rgba(212,175,55,0.04),
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
            rgba(212,175,55,0.35) 290deg, rgba(255,255,255,0.15) 310deg,
            rgba(212,175,55,0.35) 330deg, transparent 360deg);
          animation: r360-revolve 4s linear infinite;
        }
        .r360-inner-mask {
          position: absolute; inset: 2px;
          border-radius: ${34 * scale}px;
          background: linear-gradient(155deg, #2e4258 0%, #1c2d40 40%, #162536 100%);
          pointer-events: none;
        }
        .r360-sparkle {
          position: absolute; z-index: 3;
          width: 5px; height: 5px;
          background: ${GOLD}; border-radius: 50%;
          opacity: 0; filter: blur(0.5px);
          animation: r360-sparkle 4s ease-in-out infinite;
        }
        .r360-shadow {
          position: absolute; bottom: -8px; left: 50%;
          transform: translateX(-50%);
          width: ${180 * scale}px; height: ${24 * scale}px;
          background: radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%);
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
            viewBox="0 0 140 160"
            fill="none"
            style={{ position: "relative", zIndex: 2, width: "65%", height: "65%" }}
          >
            <defs>
              <linearGradient id="animatedGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={GOLD_LIGHT} />
                <stop offset="50%" stopColor={GOLD} />
                <stop offset="100%" stopColor={GOLD_DARK} />
              </linearGradient>
            </defs>

            {/* Left roof peak */}
            <path
              d="M20 90 L45 30 L65 80"
              stroke="url(#animatedGold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Center roof peak (M middle) */}
            <path
              d="M65 80 L70 40 L75 80"
              stroke="url(#animatedGold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.8"
            />

            {/* Right roof peak */}
            <path
              d="M75 80 L95 30 L120 90"
              stroke="url(#animatedGold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Left chimney */}
            <rect x="32" y="20" width="7" height="28" rx="1" stroke="url(#animatedGold)" strokeWidth="2" fill="none" />
            <rect x="32" y="15" width="7" height="6" rx="1" fill="url(#animatedGold)" />

            {/* Right chimney */}
            <rect x="101" y="20" width="7" height="28" rx="1" stroke="url(#animatedGold)" strokeWidth="2" fill="none" />
            <rect x="101" y="15" width="7" height="6" rx="1" fill="url(#animatedGold)" />

            {/* Main house body */}
            <rect
              x="18"
              y="90"
              width="104"
              height="55"
              rx="2"
              stroke="url(#animatedGold)"
              strokeWidth="3"
              fill="none"
            />

            {/* Door */}
            <rect
              x="62"
              y="112"
              width="16"
              height="33"
              rx="2"
              stroke="url(#animatedGold)"
              strokeWidth="2"
              fill="none"
              opacity="0.7"
            />

            {/* Left window */}
            <rect
              x="33"
              y="100"
              width="11"
              height="11"
              rx="1"
              stroke="url(#animatedGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />

            {/* Right window */}
            <rect
              x="96"
              y="100"
              width="11"
              height="11"
              rx="1"
              stroke="url(#animatedGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />

            {/* Base line */}
            <line
              x1="15"
              y1="145"
              x2="125"
              y2="145"
              stroke="url(#animatedGold)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="r360-shadow" />
      </div>
    </div>
  );
}
