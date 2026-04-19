"use client";

import React from "react";

interface VirtualItemProps {
  children: React.ReactNode;
  index: number;
  measure: boolean;
  onResize: (index: number, nextSize: number) => void;
}

function getElementHeight(element: HTMLElement) {
  return Math.ceil(element.getBoundingClientRect().height);
}

export function VirtualItem({ children, index, measure, onResize }: VirtualItemProps) {
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!measure) {
      return;
    }

    const element = elementRef.current;

    if (element === null) {
      return;
    }

    // 首次挂载和后续尺寸变化都走同一条上报路径。
    const reportHeight = () => {
      onResize(index, getElementHeight(element));
    };

    reportHeight();

    const observer = new ResizeObserver(() => {
      reportHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [index, measure, onResize]);

  return (
    <div data-virtuoso-index={index} ref={elementRef}>
      {children}
    </div>
  );
}
