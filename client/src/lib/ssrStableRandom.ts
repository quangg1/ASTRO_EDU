/**
 * Pseudo-random 0..1 từ seed — giống nhau trên server và client (tránh hydration mismatch do Math.random).
 */
export function sr(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
