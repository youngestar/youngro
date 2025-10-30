"use client";

import styles from "./page.module.css";
import InteractiveArea from "../../src/components/InteractiveArea";
import { Button, Icon } from "@repo/ui";
import { useChatStore } from "@youngro/chat-zustand";
import { Trash2 } from "lucide-react";

export default function Home() {
  const { cleanup, sending, messages } = useChatStore();
  return (
    <div className="p-4">
      <h1 className={styles.title}>Youngro AI Chat</h1>
      <InteractiveArea />
      {/* 外部清空按钮：位于 InteractiveArea 正下方，略微外移 */}
      <div className="mx-auto min-w-[30%] max-w-[500px] flex justify-end mt-0.5 pr-1">
        <Button
          intent="default"
          iconOnly
          title="清空历史"
          aria-label="清空历史"
          disabled={
            sending ||
            (Array.isArray(messages) &&
              messages.every((m) => m.role === "system"))
          }
          onClick={() => cleanup()}
        >
          <Icon icon={Trash2} />
        </Button>
      </div>
    </div>
  );
}
