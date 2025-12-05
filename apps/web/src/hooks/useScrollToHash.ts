import { useEffect, useRef } from "react";

type Options = {
  auto?: boolean;
  offset?: number;
  behavior?: ScrollBehavior;
  maxRetries?: number;
  retryDelay?: number;
  queryParam?: string;
  clearQueryParam?: boolean;
};

export function useScrollToHash({
  auto = true,
  offset = 16,
  behavior = "smooth",
  maxRetries = 15,
  retryDelay = 150,
  queryParam,
  clearQueryParam = false,
}: Options = {}) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!auto) return;
    let retries = 0;

    const resolveTarget = () => {
      if (queryParam) {
        const search = new URLSearchParams(window.location.search);
        const section = search.get(queryParam);
        if (section) {
          return { id: section, source: "query" as const };
        }
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        return { id: hash, source: "hash" as const };
      }

      return null;
    };

    const tryScroll = () => {
      const target = resolveTarget();
      if (!target) return;
      const el = document.getElementById(target.id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior });
        if (target.source === "query" && queryParam && clearQueryParam) {
          const url = new URL(window.location.href);
          url.searchParams.delete(queryParam);
          const next = `${url.pathname}${url.search}${url.hash}`;
          window.history.replaceState(null, "", next);
        }
        return;
      }
      if (retries < maxRetries) {
        retries += 1;
        timerRef.current = window.setTimeout(tryScroll, retryDelay);
      }
    };

    // 初次进入时尝试滚动
    tryScroll();

    const onHashChange = () => {
      retries = 0;
      tryScroll();
    };
    window.addEventListener("hashchange", onHashChange);

    let popStateHandler: ((this: Window, ev: PopStateEvent) => any) | null =
      null;
    if (queryParam) {
      popStateHandler = () => {
        retries = 0;
        tryScroll();
      };
      window.addEventListener("popstate", popStateHandler);
    }

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      if (popStateHandler) {
        window.removeEventListener("popstate", popStateHandler);
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [
    auto,
    offset,
    behavior,
    maxRetries,
    retryDelay,
    queryParam,
    clearQueryParam,
  ]);
}

export default useScrollToHash;
