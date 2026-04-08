import type { IncreaseViewportBy, Overscan, ScrollDirection } from "./types";

type ListEnd = "bottom" | "top";

export function getViewportIncrease(value: IncreaseViewportBy | undefined, end: ListEnd) {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value[end] ?? 0;
}

export function getOverscan(value: Overscan | undefined, end: ListEnd, direction: ScrollDirection) {
  if (value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    if (direction === "none") {
      return value;
    }

    return (direction === "up" && end === "top") || (direction === "down" && end === "bottom")
      ? value
      : 0;
  }

  if (direction === "up") {
    return end === "top" ? value.main : value.reverse;
  }

  if (direction === "down") {
    return end === "bottom" ? value.main : value.reverse;
  }

  return Math.max(value.main, value.reverse);
}

// 把每个 item 的高度转换成前缀偏移，后续像素定位都依赖它。
export function buildOffsets(sizes: number[]) {
  const offsets = new Array<number>(sizes.length);
  let total = 0;

  for (let index = 0; index < sizes.length; index++) {
    offsets[index] = total;
    total += sizes[index] ?? 0;
  }

  return { offsets, total };
}

// 二分找出第一个“底边进入目标区域”的 item。
export function findFirstItemWithBottomAtOrAfter(
  offsets: number[],
  sizes: number[],
  target: number
) {
  if (offsets.length === 0) {
    return 0;
  }

  let low = 0;
  let high = offsets.length - 1;
  let answer = offsets.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const bottom = (offsets[middle] ?? 0) + (sizes[middle] ?? 0);

    if (bottom >= target) {
      answer = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return answer;
}

// 二分找出最后一个“顶边仍在目标区域内”的 item。
export function findLastItemWithTopAtOrBefore(offsets: number[], target: number) {
  if (offsets.length === 0) {
    return 0;
  }

  let low = 0;
  let high = offsets.length - 1;
  let answer = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const top = offsets[middle] ?? 0;

    if (top <= target) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return answer;
}
