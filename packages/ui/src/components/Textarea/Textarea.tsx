"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

// Align default textarea style with InteractiveArea input
// w-full min-h-[100px] max-h-[300px] rounded-t-xl p-3 font-medium outline-none
// bg-primary-200/20 dark:bg-primary-400/20 text-primary-500
// placeholder-primary-400 dark:text-primary-300/50 dark:placeholder-primary-300/50
const textarea = cva(
  // Structural base; tone defines the visual style
  "w-full min-h-[100px] max-h-[300px] rounded-t-xl p-2 text-sm font-medium outline-none shadow-none ring-0 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:ring-inset focus:outline-none",
  {
    variants: {
      tone: {
        tinted:
          "bg-primary-200/20 dark:bg-primary-400/20 text-primary-600 placeholder-primary-400 dark:text-primary-300/70 dark:placeholder-primary-300/50 border-0",
        plain:
          "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-700",
      },
      intent: {
        // default matches InteractiveArea visual by default
        default: "",
        destructive:
          "ring-1 ring-red-300 focus:ring-2 focus:ring-red-400 dark:ring-red-400/60",
      },
      size: {
        sm: "text-sm p-2",
        md: "text-sm p-3",
        lg: "text-base p-4",
      },
      focusStyle: {
        // No focus ring visuals
        none: "",
        // Brand-colored subtle ring
        brand:
          "focus:ring-2 focus:ring-primary-400/40 dark:focus:ring-primary-300/40",
      },
    },
    defaultVariants: {
      tone: "tinted",
      intent: "default",
      size: "md",
      focusStyle: "brand",
    },
  },
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textarea> & {
    autoResize?: boolean; // 自动增高到上限，再进入可滚动
    minRows?: number; // 用于计算最小高度（与 CSS min-h 共同起效，取更大者）
    maxRows?: number; // 用于计算最大高度（与 CSS max-h 共同起效，取更小者）
    maxHeight?: number; // 若提供则覆盖由 maxRows 计算出的最大高度（单位 px）
  };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      tone,
      intent,
      size,
      focusStyle,
      autoResize = true,
      minRows = 2,
      maxRows,
      maxHeight,
      onChange,
      onInput,
      style,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    // 合并外部 ref
    useLayoutEffect(() => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(innerRef.current);
      } else {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          innerRef.current;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parsePx = (v: string) =>
      v && v !== "normal" && v !== "none" ? parseFloat(v) : NaN;

    const adjustHeight = useCallback(() => {
      if (!autoResize) return;
      const el = innerRef.current;
      if (!el) return;
      const cs = window.getComputedStyle(el);

      // 计算行高（line-height 可能为 'normal'）
      let lineHeight = parsePx(cs.lineHeight);
      if (!Number.isFinite(lineHeight)) {
        const fontSize = parsePx(cs.fontSize) || 16;
        lineHeight = fontSize * 1.2; // 经验值
      }
      const paddingY =
        (parsePx(cs.paddingTop) || 0) + (parsePx(cs.paddingBottom) || 0);
      const borderY =
        (parsePx(cs.borderTopWidth) || 0) +
        (parsePx(cs.borderBottomWidth) || 0);

      // 从 props 计算 max 高度
      let maxPx = Number.POSITIVE_INFINITY;
      if (typeof maxHeight === "number" && maxHeight > 0) {
        maxPx = maxHeight;
      } else if (typeof maxRows === "number" && maxRows > 0) {
        maxPx = lineHeight * maxRows + paddingY + borderY;
      } else {
        // 读取 CSS max-height（类如 max-h-[300px]），否则无限
        const cssMax = parsePx(cs.maxHeight);
        if (Number.isFinite(cssMax)) maxPx = cssMax;
      }

      // 从 props 和 CSS 计算 min 高度
      const minByRows = lineHeight * Math.max(1, minRows) + paddingY + borderY;
      const cssMin = parsePx(cs.minHeight);
      const minPx = Number.isFinite(cssMin)
        ? Math.max(cssMin, minByRows)
        : minByRows;

      // 先置为 auto 以获取真实 scrollHeight
      el.style.height = "auto";
      const contentHeight = el.scrollHeight; // 含 padding
      const clamped = Math.max(minPx, Math.min(contentHeight, maxPx));
      el.style.height = `${clamped}px`;
      // 超过上限再允许滚动
      el.style.overflowY = contentHeight > maxPx ? "auto" : "hidden";
      // 禁用用户拖拽 resize，避免与自适应冲突
      if (autoResize) el.style.resize = "none";
    }, [autoResize, maxHeight, maxRows, minRows]);

    // 初始与 value 变化时调整
    useEffect(() => {
      if (!autoResize) return;
      const rAF = requestAnimationFrame(adjustHeight);
      return () => cancelAnimationFrame(rAF);
    }, [autoResize, props.value, adjustHeight]);

    // 输入/粘贴时也调整
    const handleInput: React.FormEventHandler<HTMLTextAreaElement> = (e) => {
      if (onInput) onInput(e);
      if (!autoResize) return;
      requestAnimationFrame(adjustHeight);
    };

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
      if (onChange) onChange(e);
      if (!autoResize) return;
      requestAnimationFrame(adjustHeight);
    };

    return (
      <textarea
        ref={innerRef}
        {...props}
        onInput={handleInput}
        onChange={handleChange}
        style={style}
        className={clsx(
          textarea({ tone, intent, size, focusStyle }),
          className,
        )}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export default Textarea;
