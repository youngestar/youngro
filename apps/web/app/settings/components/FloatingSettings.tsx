"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Settings as SettingsIcon, SmilePlus } from "lucide-react";

export function FloatingSettings() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // trigger enter animation on mount
    const id = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(id);
  }, []);

  const pathname = usePathname() || "";
  const isYoungroCard = pathname.startsWith("/settings/youngro-card");
  const IconComp = isYoungroCard ? SmilePlus : SettingsIcon;

  return (
    <div
      aria-hidden
      className={
        "pointer-events-none fixed z-[-1] flex items-center justify-center"
      }
      style={{
        // mirror: top="calc(100dvh - 12rem)", right="-2.5rem" (right--10), size-60 (15rem)
        top: "calc(100dvh - 12rem)",
        right: "-2.5rem",
        width: "15rem",
        height: "15rem",
        color: "#E4E4E4",
        transform: mounted
          ? "scale(1) rotate(0deg)"
          : "scale(0.9) rotate(180deg)",
        opacity: mounted ? 1 : 0,
        transition: "transform 500ms ease, opacity 500ms ease",
      }}
    >
      <IconComp width={240} height={240} strokeWidth={1.25} />
    </div>
  );
}

export default FloatingSettings;
