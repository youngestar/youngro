"use client";

import { useRouter } from "next/navigation";

export type TurnOptions = { replace?: boolean };

/**
 * useTurnToPage
 * A small reusable hook that navigates to a path. Supports optional query object and replace option.
 */
export const useTurnToPage = () => {
  const router = useRouter();

  return async (
    pathOrPathname: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: TurnOptions
  ) => {
    let path = pathOrPathname;
    if (query && Object.keys(query).length) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
      path = `${path}?${params.toString()}`;
    }

    if (options?.replace) {
      await router.replace(path);
    } else {
      await router.push(path);
    }
  };
};

export default useTurnToPage;
