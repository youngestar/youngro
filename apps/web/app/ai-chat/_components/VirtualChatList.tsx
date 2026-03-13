"use client";

import React from "react";
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import AiChatMessage, { type AiChatMessageProps } from "./AIChatMessage";
import styles from "./InteractiveArea.module.css";
import { useVirtualChatScroll } from "../../../src/hooks/useVirtualChatScroll";

export interface VirtualChatItem extends AiChatMessageProps {
  id: string;
  kind: "history" | "streaming";
}

export interface VirtualChatListProps {
  items: VirtualChatItem[];
  sending: boolean;
}

export function VirtualChatList({ items, sending }: VirtualChatListProps) {
  const { t } = useTranslation();
  const { virtuosoRef, showBackToBottom, handleAtBottomStateChange, scrollToBottom } =
    useVirtualChatScroll(items.length, sending);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        style={{ height: "100%", width: "100%" }}
        className={styles.chatScroller}
        initialTopMostItemIndex={items.length > 0 ? items.length - 1 : undefined}
        computeItemKey={(_index, item) => item.id}
        alignToBottom
        overscan={400}
        atBottomStateChange={handleAtBottomStateChange}
        followOutput={(isAtBottom) => (isAtBottom ? "auto" : false)}
        itemContent={(_index, item) => (
          <div className="px-2 py-1">
            <AiChatMessage {...item} />
          </div>
        )}
      />

      {showBackToBottom && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-600/90 px-3 text-xs font-medium text-white shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:bg-primary-400/90 dark:text-neutral-900 dark:hover:bg-primary-300"
            aria-label={t("stage.chat.action.back-to-bottom", {
              defaultValue: "回到底部",
            })}
          >
            {t("stage.chat.action.back-to-bottom", {
              defaultValue: "回到底部",
            })}
          </button>
        </div>
      )}
    </div>
  );
}

export default VirtualChatList;
