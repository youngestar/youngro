"use client";

import React from "react";
import clsx from "clsx";

import {
  buildOffsets,
  findFirstItemWithBottomAtOrAfter,
  findLastItemWithTopAtOrBefore,
  getOverscan,
  getViewportIncrease,
} from "./rangeCalculator";
import { VirtualItem } from "./VirtualItem";

import type {
  ListRange,
  ScrollBehavior,
  ScrollDirection,
  ScrollToIndexLocation,
  VirtuosoItem,
  VirtuosoLiteHandle,
  VirtuosoLiteProps,
} from "./types";

const MAX_SCROLL_ALIGNMENT_ATTEMPTS = 6;
const SCROLL_ALIGNMENT_EPSILON = 2;
const SCROLL_IDLE_DELAY = 96;

interface PendingScrollTarget extends Required<ScrollToIndexLocation> {
  attempts: number;
}

function normalizeScrollToIndex(
  location: number | ScrollToIndexLocation
): Required<ScrollToIndexLocation> {
  if (typeof location === "number") {
    return { align: "start", behavior: "auto", index: location, offset: 0 };
  }

  return {
    align: location.align ?? "start",
    behavior: location.behavior ?? "auto",
    index: location.index,
    offset: location.offset ?? 0,
  };
}

function getAlignedScrollTop(
  itemTop: number,
  itemSize: number,
  viewportHeight: number,
  location: Required<ScrollToIndexLocation>
) {
  let nextTop = itemTop;

  if (location.align === "center") {
    nextTop = itemTop - viewportHeight / 2 + itemSize / 2;
  } else if (location.align === "end") {
    nextTop = itemTop - viewportHeight + itemSize;
  }

  return nextTop + location.offset;
}

function VirtuosoLiteInner<T>(
  {
    className,
    computeItemKey,
    data,
    defaultItemHeight = 72,
    fixedItemHeight,
    heightEstimates,
    increaseViewportBy,
    initialTopMostItemIndex,
    itemContent,
    onEndReached,
    onRangeChanged,
    onScroll: onScrollProp,
    onStartReached,
    overscan,
    style,
    totalCount: totalCountProp,
    ...rest
  }: VirtuosoLiteProps<T>,
  forwardedRef: React.ForwardedRef<VirtuosoLiteHandle>
) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  // 这里只缓存真实测量过的高度，未测量项仍回退到估算值。
  const measuredSizesRef = React.useRef(new Map<number, number>());
  // 用已测量项的平均高度改善远距离跳转时的首轮估算。
  const measuredAverageSizeRef = React.useRef(defaultItemHeight);
  // scrollToIndex 分成“先估算靠近、再根据真实 DOM 校正”两个阶段。
  const pendingScrollTargetRef = React.useRef<PendingScrollTarget | null>(null);
  const scrollIdleTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialScrollAppliedRef = React.useRef(false);
  const lastRangeRef = React.useRef("");
  const lastStartReachedRef = React.useRef<number | null>(null);
  const lastEndReachedRef = React.useRef<number | null>(null);
  const previousScrollTopRef = React.useRef(0);

  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const [scrollDirection, setScrollDirection] = React.useState<ScrollDirection>("none");
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [sizeVersion, bumpSizeVersion] = React.useReducer((value: number) => value + 1, 0);

  const totalCount = data?.length ?? totalCountProp ?? 0;
  const measurementEnabled = fixedItemHeight === undefined;
  const estimatedItemHeight = measuredAverageSizeRef.current || defaultItemHeight;

  // 当前高度模型的优先级：固定高度 > 实测高度 > 单项估算 > 默认高度。
  const sizes = React.useMemo(() => {
    // measuredSizesRef 是原地更新的，依赖 sizeVersion 来强制重新计算高度模型。
    void sizeVersion;

    if (totalCount === 0) {
      return [] as number[];
    }

    return Array.from({ length: totalCount }, (_, index) => {
      if (fixedItemHeight !== undefined) {
        return fixedItemHeight;
      }

      return measuredSizesRef.current.get(index) ?? heightEstimates?.[index] ?? estimatedItemHeight;
    });
  }, [estimatedItemHeight, fixedItemHeight, heightEstimates, sizeVersion, totalCount]);

  // 把高度模型转成前缀和，便于在像素位置和索引之间来回映射。
  const { offsets, total } = React.useMemo(() => buildOffsets(sizes), [sizes]);

  const renderRange = React.useMemo<ListRange>(() => {
    if (totalCount === 0) {
      return { endIndex: 0, startIndex: 0 };
    }

    const visibleTop = Math.max(
      0,
      scrollTop -
        getViewportIncrease(increaseViewportBy, "top") -
        getOverscan(overscan, "top", scrollDirection)
    );

    const visibleBottom =
      scrollTop +
      viewportHeight +
      getViewportIncrease(increaseViewportBy, "bottom") +
      getOverscan(overscan, "bottom", scrollDirection);

    // 先扩张可视区，再用二分把像素范围映射成索引范围。
    return {
      endIndex: findLastItemWithTopAtOrBefore(offsets, visibleBottom),
      startIndex: findFirstItemWithBottomAtOrAfter(offsets, sizes, visibleTop),
    };
  }, [
    increaseViewportBy,
    offsets,
    overscan,
    scrollDirection,
    scrollTop,
    sizes,
    totalCount,
    viewportHeight,
  ]);

  const items = React.useMemo(() => {
    if (totalCount === 0) {
      return [] as VirtuosoItem<T>[];
    }

    const nextItems: VirtuosoItem<T>[] = [];

    for (let index = renderRange.startIndex; index <= renderRange.endIndex; index++) {
      nextItems.push({
        data: data?.[index],
        index,
        size: sizes[index] ?? defaultItemHeight,
        top: offsets[index] ?? 0,
      });
    }

    return nextItems;
  }, [
    data,
    defaultItemHeight,
    offsets,
    renderRange.endIndex,
    renderRange.startIndex,
    sizes,
    totalCount,
  ]);

  const paddingTop = items[0]?.top ?? 0;
  const lastItem = items[items.length - 1];
  // 通过上下 padding 撑开未渲染区域，让可见项保持正常文档流。
  const paddingBottom =
    lastItem === undefined ? 0 : Math.max(total - (lastItem.top + lastItem.size), 0);

  const alignScrollTop = React.useCallback((top: number, scroller: HTMLDivElement) => {
    const maxScrollTop = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    return Math.max(0, Math.min(top, maxScrollTop));
  }, []);

  const performEstimatedScroll = React.useCallback(
    (location: Required<ScrollToIndexLocation>, behavior: ScrollBehavior) => {
      const scroller = scrollerRef.current;

      if (scroller === null || totalCount === 0) {
        return;
      }

      // 第一阶段先基于当前 offsets 把目标项滚到附近。
      const index = Math.max(0, Math.min(totalCount - 1, location.index));
      const itemTop = offsets[index] ?? 0;
      const itemSize = sizes[index] ?? estimatedItemHeight;
      const nextTop = getAlignedScrollTop(itemTop, itemSize, scroller.clientHeight, location);

      scroller.scrollTo({
        behavior,
        top: alignScrollTop(nextTop, scroller),
      });
    },
    [alignScrollTop, estimatedItemHeight, offsets, sizes, totalCount]
  );

  const scrollToIndex = React.useCallback(
    (location: number | ScrollToIndexLocation) => {
      const normalized = normalizeScrollToIndex(location);
      pendingScrollTargetRef.current = { ...normalized, attempts: 0 };
      performEstimatedScroll(normalized, normalized.behavior);
    },
    [performEstimatedScroll]
  );

  const onItemResize = React.useCallback(
    (index: number, nextSize: number) => {
      if (!measurementEnabled || nextSize <= 0) {
        return;
      }

      const previousMeasuredSize = measuredSizesRef.current.get(index);
      const previousSize = previousMeasuredSize ?? heightEstimates?.[index] ?? estimatedItemHeight;

      if (Math.abs(previousSize - nextSize) < 1) {
        return;
      }

      // 动态维护平均高度，让后续未测量项的估算更接近当前列表分布。
      if (previousMeasuredSize === undefined) {
        const measuredCount = measuredSizesRef.current.size;
        measuredAverageSizeRef.current = Math.round(
          (measuredAverageSizeRef.current * measuredCount + nextSize) / (measuredCount + 1)
        );
      } else {
        const measuredCount = measuredSizesRef.current.size;
        measuredAverageSizeRef.current = Math.round(
          (measuredAverageSizeRef.current * measuredCount - previousMeasuredSize + nextSize) /
            Math.max(measuredCount, 1)
        );
      }

      measuredSizesRef.current.set(index, nextSize);

      const scroller = scrollerRef.current;
      const itemTop = offsets[index] ?? 0;
      const delta = nextSize - previousSize;

      // 如果变高的项在视口上方，补偿 scrollTop，避免用户眼前内容跳动。
      if (scroller !== null && itemTop < scroller.scrollTop) {
        scroller.scrollTop += delta;
        setScrollTop(scroller.scrollTop);
      }

      bumpSizeVersion();
    },
    [estimatedItemHeight, heightEstimates, measurementEnabled, offsets]
  );

  React.useImperativeHandle(
    forwardedRef,
    () => ({
      scrollBy(location: ScrollToOptions) {
        scrollerRef.current?.scrollBy(location);
      },
      scrollTo(location: ScrollToOptions) {
        scrollerRef.current?.scrollTo(location);
      },
      scrollToIndex(location: number | ScrollToIndexLocation) {
        scrollToIndex(location);
      },
    }),
    [scrollToIndex]
  );

  React.useEffect(() => {
    const scroller = scrollerRef.current;

    if (scroller === null) {
      return;
    }

    const syncViewport = () => {
      setViewportHeight(scroller.clientHeight);
    };

    syncViewport();

    const observer = new ResizeObserver(() => {
      syncViewport();
    });

    observer.observe(scroller);

    return () => {
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (scrollIdleTimeoutRef.current !== null) {
        clearTimeout(scrollIdleTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    // 等拿到真实 viewport 高度后，再做首次程序化定位。
    if (
      initialScrollAppliedRef.current ||
      initialTopMostItemIndex === undefined ||
      viewportHeight === 0
    ) {
      return;
    }

    initialScrollAppliedRef.current = true;
    scrollToIndex(initialTopMostItemIndex);
  }, [initialTopMostItemIndex, scrollToIndex, viewportHeight]);

  React.useLayoutEffect(() => {
    const pendingTarget = pendingScrollTargetRef.current;
    const scroller = scrollerRef.current;

    if (pendingTarget === null || scroller === null || viewportHeight === 0) {
      return;
    }

    const targetIsRendered =
      pendingTarget.index >= renderRange.startIndex && pendingTarget.index <= renderRange.endIndex;

    if (!targetIsRendered) {
      // 目标还没进入 DOM 时，按最新估算结果继续推进一轮滚动。
      if (isScrolling || pendingTarget.attempts >= MAX_SCROLL_ALIGNMENT_ATTEMPTS) {
        if (pendingTarget.attempts >= MAX_SCROLL_ALIGNMENT_ATTEMPTS) {
          pendingScrollTargetRef.current = null;
        }

        return;
      }

      pendingScrollTargetRef.current = {
        ...pendingTarget,
        attempts: pendingTarget.attempts + 1,
      };

      performEstimatedScroll(pendingTarget, "auto");
      return;
    }

    // smooth 首跳期间先等滚动停稳，再做第二阶段校正。
    if (pendingTarget.behavior === "smooth" && isScrolling) {
      return;
    }

    const renderedItem = scroller.querySelector<HTMLElement>(
      `[data-virtuoso-index="${pendingTarget.index}"]`
    );

    if (renderedItem === null) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const itemRect = renderedItem.getBoundingClientRect();
    const actualTop = scroller.scrollTop + itemRect.top - scrollerRect.top;
    const desiredTop = alignScrollTop(
      getAlignedScrollTop(actualTop, itemRect.height, scroller.clientHeight, pendingTarget),
      scroller
    );
    const delta = desiredTop - scroller.scrollTop;

    console.log(pendingTarget.index, scroller.scrollTop, actualTop, itemRect.height, desiredTop);

    if (
      Math.abs(delta) <= SCROLL_ALIGNMENT_EPSILON ||
      pendingTarget.attempts >= MAX_SCROLL_ALIGNMENT_ATTEMPTS
    ) {
      pendingScrollTargetRef.current = null;
      return;
    }

    pendingScrollTargetRef.current = {
      ...pendingTarget,
      attempts: pendingTarget.attempts + 1,
    };

    // 第二阶段改用 DOM 真实位置校正，尽快把目标项贴到正确落点。
    scroller.scrollTo({
      behavior: "auto",
      top: desiredTop,
    });
  }, [
    alignScrollTop,
    isScrolling,
    performEstimatedScroll,
    renderRange.endIndex,
    renderRange.startIndex,
    sizeVersion,
    viewportHeight,
  ]);

  React.useEffect(() => {
    if (totalCount === 0) {
      return;
    }

    const rangeKey = `${renderRange.startIndex}:${renderRange.endIndex}`;

    // 只在范围真正变化时触发回调，避免重复通知。
    if (rangeKey === lastRangeRef.current) {
      return;
    }

    lastRangeRef.current = rangeKey;
    onRangeChanged?.(renderRange);

    if (renderRange.startIndex === 0 && lastStartReachedRef.current !== 0) {
      lastStartReachedRef.current = 0;
      onStartReached?.(0);
    }

    if (renderRange.endIndex === totalCount - 1 && lastEndReachedRef.current !== totalCount - 1) {
      lastEndReachedRef.current = totalCount - 1;
      onEndReached?.(totalCount - 1);
    }

    if (renderRange.startIndex > 0) {
      lastStartReachedRef.current = null;
    }

    if (renderRange.endIndex < totalCount - 1) {
      lastEndReachedRef.current = null;
    }
  }, [onEndReached, onRangeChanged, onStartReached, renderRange, totalCount]);

  return (
    <div
      {...rest}
      className={clsx("h-full overflow-y-auto overscroll-contain", className)}
      onScroll={(event: React.UIEvent<HTMLDivElement>) => {
        onScrollProp?.(event);

        const nextScrollTop = event.currentTarget.scrollTop;

        setIsScrolling(true);

        if (scrollIdleTimeoutRef.current !== null) {
          clearTimeout(scrollIdleTimeoutRef.current);
        }

        // 用短延迟近似“滚动已经停下”，给第二阶段校正一个稳定时机。
        scrollIdleTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
          setScrollDirection("none");
        }, SCROLL_IDLE_DELAY);

        // 记录滚动方向，给 overscan 的主方向偏置使用。
        if (nextScrollTop > previousScrollTopRef.current) {
          setScrollDirection("down");
        } else if (nextScrollTop < previousScrollTopRef.current) {
          setScrollDirection("up");
        }

        previousScrollTopRef.current = nextScrollTop;
        setScrollTop(nextScrollTop);
      }}
      ref={scrollerRef}
      style={style}
    >
      <div className="min-h-full" style={{ paddingBottom, paddingTop }}>
        {items.map((item) => (
          <VirtualItem
            index={item.index}
            key={computeItemKey?.(item.index, item.data) ?? item.index}
            measure={measurementEnabled}
            onResize={onItemResize}
          >
            {itemContent(item.index, item.data)}
          </VirtualItem>
        ))}
      </div>
    </div>
  );
}

export const VirtuosoLite = React.forwardRef(VirtuosoLiteInner) as <T>(
  props: VirtuosoLiteProps<T> & React.RefAttributes<VirtuosoLiteHandle>
) => React.ReactElement | null;
