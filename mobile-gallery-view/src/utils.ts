export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function toMb(bytes: number): number {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

export function randomFallbackName(seed: number): string {
  const adjectives = [
    "Calm",
    "Bright",
    "Swift",
    "Amber",
    "Olive",
    "Coral",
    "Silver",
    "Aqua",
  ];
  const nouns = ["River", "Leaf", "Stone", "Cloud", "Star", "Trail", "Field", "Dawn"];
  const left = adjectives[seed % adjectives.length];
  const right = nouns[(seed * 7) % nouns.length];
  return `${left} ${right}`;
}

export function safeId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hammingDistance(left: string, right: string): number {
  const size = Math.min(left.length, right.length);
  let distance = Math.abs(left.length - right.length);
  for (let i = 0; i < size; i += 1) {
    if (left[i] !== right[i]) {
      distance += 1;
    }
  }
  return distance;
}
