/**
 * lib-utils: 放置与 React/Next 无关的通用工具函数，
 * 不依赖 UI/feature/store，便于 SSR 或脚本环境复用。
 */

export function invariant(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[invariant] ${message}`);
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${String(x)}`);
}
