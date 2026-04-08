import type React from "react";

export type ScrollAlign = "center" | "end" | "start";
export type ScrollBehavior = "auto" | "smooth";
export type ScrollDirection = "down" | "none" | "up";

export type IncreaseViewportBy = number | { bottom?: number; top?: number };
export type Overscan = number | { main: number; reverse: number };

export interface ScrollToIndexLocation {
  align?: ScrollAlign;
  behavior?: ScrollBehavior;
  index: number;
  offset?: number;
}

export interface ListRange {
  endIndex: number;
  startIndex: number;
}

export interface VirtuosoItem<T> {
  data: T | undefined;
  index: number;
  size: number;
  top: number;
}

export interface VirtuosoLiteHandle {
  scrollBy(location: ScrollToOptions): void;
  scrollTo(location: ScrollToOptions): void;
  scrollToIndex(location: number | ScrollToIndexLocation): void;
}

export interface VirtuosoLiteProps<T>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "data"> {
  computeItemKey?: (index: number, data: T | undefined) => React.Key;
  data?: readonly T[];
  defaultItemHeight?: number;
  fixedItemHeight?: number;
  heightEstimates?: number[];
  increaseViewportBy?: IncreaseViewportBy;
  initialTopMostItemIndex?: number | ScrollToIndexLocation;
  itemContent: (index: number, data: T | undefined) => React.ReactNode;
  onEndReached?: (index: number) => void;
  onRangeChanged?: (range: ListRange) => void;
  onStartReached?: (index: number) => void;
  overscan?: Overscan;
  totalCount?: number;
}
