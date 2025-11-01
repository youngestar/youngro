"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import useTurnToPage from "../../src/hooks/useTurnToPage";
import { Button, Icon } from "@repo/ui";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const turnTo = useTurnToPage();

  return (
    <div
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
      }}
      className="h-full w-full"
    >
      {/* Header */}
      <div className="w-full bg-[var(--background)]/80 backdrop-blur px-3 py-3">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2">
          <Link
            href="/"
            className="outline-none inline-flex items-center gap-2 text-xl font-semibold"
          >
            {/* 简洁站点标题：可替换为图片 Logo；色相可复用 --chromatic-hue */}
            <span
              className="select-none"
              style={{
                filter: "hue-rotate(calc(var(--chromatic-hue, 0) * 1deg))",
              }}
            >
              YOUNGRO
            </span>
          </Link>

          <div>
            <Button
              intent="default"
              iconOnly
              title="设置"
              aria-label="设置"
              onClick={() => turnTo("/settings")}
            >
              <Icon icon={Settings} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto h-[calc(100%-56px)] max-w-screen-2xl px-3 py-3">
        {children}
      </div>
    </div>
  );
}
