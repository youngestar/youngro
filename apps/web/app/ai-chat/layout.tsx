"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import React from "react";
import { Settings } from "lucide-react";
import useTurnToPage from "../../src/hooks/useTurnToPage";
import { Button, Icon } from "@repo/ui";
import CrossBackground from "../../src/components/Backgrounds/CrossBackground";
import AnimatedWave from "../../src/components/Widgets/AnimatedWave";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const turnTo = useTurnToPage();

  return (
    <CrossBackground>
      <AnimatedWave>
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
          <div className="w-full bg-[var(--background)]/80 px-3 py-3 relative z-10">
            <div className="mx-auto flex items-center justify-between gap-2">
              <Link
                href="/"
                className="outline-none inline-flex items-center gap-2 text-xl font-semibold"
              >
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
          <div className="mx-auto h-[calc(100%-56px)] px-3 py-3 relative z-10">
            {children}
          </div>
        </div>
      </AnimatedWave>
    </CrossBackground>
  );
}
