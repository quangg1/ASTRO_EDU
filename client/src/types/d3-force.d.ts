/**
 * d3-force has no official bundled types; loose `any` return keeps
 * react-force-graph's d3Force(...) happy under strict mode.
 */
declare module 'd3-force' {
  export function forceRadial<T = unknown>(
    radius: (node: T) => number,
    x?: number,
    y?: number,
  ): any
  export function forceX<T = unknown>(x: (node: T) => number): any
  export function forceY<T = unknown>(y: (node: T) => number): any
  export function forceCollide<T = unknown>(radius: (node: T) => number): any
  export function forceManyBody<T = unknown>(): any
  export function forceCenter(x: number, y: number): any
}
