import { useEffect, useRef } from "react";

type Options = {
  auto?: boolean;
  offset?: number;
  behavior?: ScrollBehavior;
  maxRetries?: number;
  retryDelay?: number;
};

export function useScrollToHash({
  auto = true,
  offset = 16,
  behavior = "smooth",
  maxRetries = 15,
  retryDelay = 150,
}: Options = {}) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!auto) return;
    let retries = 0;

    const tryScroll = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior });
        return;
      }
      if (retries < maxRetries) {
        retries += 1;
        timerRef.current = window.setTimeout(tryScroll, retryDelay);
      }
    };

    // 初次进入时尝试滚动
    tryScroll();

    // 监听 hash 变化
    const onHashChange = () => {
      retries = 0;
      tryScroll();
    };
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [auto, offset, behavior, maxRetries, retryDelay]);
}

export default useScrollToHash;
