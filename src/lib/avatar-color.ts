/**
 * Generate a consistent HSL color from a string (name).
 * Same name always produces same color. Colors are soft pastels.
 */
export function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 65%, 92%)`,
    text: `hsl(${hue}, 65%, 35%)`,
  };
}

/**
 * Get initials from a name (up to 2 chars).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
