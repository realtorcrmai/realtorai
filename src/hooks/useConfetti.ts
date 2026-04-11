import confetti from "canvas-confetti";

/**
 * Reusable confetti hook (C1).
 * Fires fireworks from both sides with brand colors.
 * Respects prefers-reduced-motion.
 */
export function fireConfetti() {
  // Respect reduced motion preference
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const defaults = { startVelocity: 30, spread: 55, ticks: 60, zIndex: 9999 };

  // 3 bursts over 2 seconds
  const fire = (delay: number) => {
    setTimeout(() => {
      // Left side — brand indigo + coral
      confetti({
        ...defaults,
        particleCount: 80,
        angle: 60,
        origin: { x: 0, y: 0.6 },
        colors: ["#4f35d2", "#ff5c3a", "#7c5cfc", "#ff8a6a"],
      });
      // Right side — teal + gold
      confetti({
        ...defaults,
        particleCount: 80,
        angle: 120,
        origin: { x: 1, y: 0.6 },
        colors: ["#00bfa5", "#FFD700", "#059669", "#FFA500"],
      });
    }, delay);
  };

  fire(0);
  fire(700);
  fire(1400);
}
