import type { ReactNode } from "react";
import { HeaderLink } from "@repo/ui";
import FloatingSettings from "./components/FloatingSettings";

export default function SettingsLayout({ children }: { children: ReactNode }) {
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
        <div className="mx-auto flex items-center gap-2">
          <HeaderLink href="/" title="YOUNGRO" />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto 2xl:max-w-screen-2xl px-3 xl:px-4 py-0 flex flex-col">
        {children}
        <FloatingSettings />
      </div>
    </div>
  );
}
