"use client";

import React from "react";
import clsx from "clsx";
import { Button, Checkbox, Icon, Textarea, VirtuosoLite } from "@youngro/ui";
import type { ListRange, VirtuosoLiteHandle } from "@youngro/ui";
import { RefreshCcw, Send, Sparkles } from "lucide-react";

import MarkdownRenderer from "../../../src/components/MarkdownRenderer";
import styles from "./VirtuosoLiteChatDemo.module.css";

type DemoMessageRole = "assistant" | "error" | "user";
type ScrollBehavior = "auto" | "smooth";
type MessageRenderMode = "markdown" | "plain-text";

interface DemoChatMessage {
  content: string;
  id: string;
  loading?: boolean;
  name: string;
  role: DemoMessageRole;
}

const TOPICS = [
  "滚动锚点",
  "不定高消息",
  "列表测量",
  "回到底部按钮",
  "overscan",
  "滚动校正",
  "流式占位",
  "Markdown 渲染",
];

function buildAssistantSeed(index: number) {
  const topic = TOPICS[index % TOPICS.length] ?? "虚拟滚动";

  switch (index % 4) {
    case 0:
      return [
        `### ${topic} 调试记录`,
        "",
        `这是一条用于测试 **VirtuosoLite** 的 mock 回复，第 ${index + 1} 轮会故意拉长内容高度。`,
        "",
        "- 验证窗口范围切换",
        "- 验证消息追加后的自动滚底",
        "- 验证长段落和列表混排",
        "",
        "为了方便观察滚动窗口变化，这里再补一段较长的描述文本。它不会依赖原来的 chat store，也不会走真实的 provider 请求，只使用本地数组来组织消息内容。",
      ].join("\n");
    case 1:
      return [
        `收到，下面继续围绕 **${topic}** 做调试说明。`,
        "",
        "```ts",
        `const debugCase = {`,
        `  topic: "${topic}",`,
        '  source: "mock-array",',
        '  virtualization: "virtuoso-lite",',
        `};`,
        "```",
        "",
        "这段代码块主要用来制造更明显的高度差。",
      ].join("\n");
    case 2:
      return [
        `围绕 ${topic}，这条回复会混合多段短句。`,
        "",
        "第一段用于观察消息气泡的最小高度。",
        "第二段稍微长一些，用来确认渲染范围切换时不会突然跳动。",
        "第三段继续补充，让你在 `components-demo` 页面里更容易复现滚动细节。",
      ].join("\n\n");
    default:
      return [
        `> 当前主题：${topic}`,
        "",
        "这一条故意使用引用块开头，再跟一段正文，模拟真实聊天里常见的总结式回复。",
        "",
        "如果你继续在输入框里发送内容，新的 mock 消息会继续追加在底部，以便观察程序化滚动行为。",
      ].join("\n");
  }
}

function buildUserSeed(index: number) {
  const topic = TOPICS[index % TOPICS.length] ?? "虚拟滚动";
  return `第 ${index + 1} 轮：请帮我检查 ${topic} 在聊天场景中的表现，尤其是不定高消息和回到底部逻辑。`;
}

function buildErrorSeed(index: number) {
  const topic = TOPICS[index % TOPICS.length] ?? "虚拟滚动";
  return [
    `模拟错误：${topic} 调试分支暂时不可用。`,
    "",
    "请忽略这条错误消息，它只是用于验证 error 气泡在新列表里的样式和高度测量。",
  ].join("\n");
}

function buildInitialMessages() {
  const items: DemoChatMessage[] = [];

  for (let index = 0; index < 18; index++) {
    items.push({
      content: buildUserSeed(index),
      id: `seed-user-${index}`,
      name: "user",
      role: "user",
    });

    if (index > 0 && index % 6 === 0) {
      items.push({
        content: buildErrorSeed(index),
        id: `seed-error-${index}`,
        name: "error",
        role: "error",
      });
    }

    items.push({
      content: buildAssistantSeed(index),
      id: `seed-assistant-${index}`,
      name: "爱丽",
      role: "assistant",
    });
  }

  return items;
}

const INITIAL_MESSAGES = buildInitialMessages();

function buildMockReply(prompt: string, sequence: number) {
  const topic = TOPICS[sequence % TOPICS.length] ?? "虚拟滚动";

  return [
    "已收到新的本地调试输入。",
    "",
    `> ${prompt}`,
    "",
    `这条回复继续围绕 **${topic}** 展开，用来验证新增消息后 VirtuosoLite 的滚动跟随是否稳定。`,
    "",
    "- 不会触发真实网络请求",
    "- 不依赖 chat store / provider / 语音播放",
    "- 只使用页面内 mock 数组组织数据",
    "",
    sequence % 2 === 0
      ? "为了制造更明显的不定高效果，这里额外补一段偏长说明文本。你可以先滚到中间，再发送一条消息，观察它是否会按照预期自动贴到底部。"
      : [
          "```tsx",
          "<VirtuosoLite",
          "  overscan={{ main: 320, reverse: 120 }}",
          "  increaseViewportBy={{ top: 160, bottom: 320 }}",
          "/>",
          "```",
        ].join("\n"),
  ].join("\n");
}

function buildLongAssistantNote(sequence: number) {
  const topic = TOPICS[sequence % TOPICS.length] ?? "虚拟滚动";

  return [
    `### 手动追加的长消息 ${sequence + 1}`,
    "",
    `当前聚焦：**${topic}**。这条消息专门用来制造更高的 item，方便观察 ` +
      "`ResizeObserver` 测量后列表如何进行二次校正。",
    "",
    "1. 先看当前可见范围是否变化。",
    "2. 再看回到底部按钮是否按预期出现或消失。",
    "3. 最后确认长内容不会导致视口上方消息抖动。",
    "",
    "补充段落 A：当消息内容显著变长时，新的虚拟列表需要尽快更新 offsets，同时避免把用户正在看的位置突然顶走。",
    "",
    "补充段落 B：这个 demo 页面保留了聊天框外观，但切断了原项目的发送、模型、语音和 store 依赖，因此更适合做滚动调试。",
    "",
    "补充段落 C：如果你想继续加压测试，可以连续点几次这个按钮，再滚动到顶部和底部观察窗口切换。",
  ].join("\n");
}

function useVirtuosoLiteChatScroll(itemCount: number) {
  const virtuosoRef = React.useRef<VirtuosoLiteHandle | null>(null);
  const itemCountRef = React.useRef(itemCount);
  const previousItemCountRef = React.useRef(itemCount);
  const initializedRef = React.useRef(false);
  const isAtBottomRef = React.useRef(true);
  const [showBackToBottom, setShowBackToBottom] = React.useState(false);

  React.useEffect(() => {
    itemCountRef.current = itemCount;
  }, [itemCount]);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const lastIndex = itemCountRef.current - 1;

    if (!virtuosoRef.current || lastIndex < 0) {
      return;
    }

    virtuosoRef.current.scrollToIndex({
      align: "end",
      behavior,
      index: lastIndex,
    });
    setShowBackToBottom(false);
  }, []);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const atBottom = distanceFromBottom <= 24;

    isAtBottomRef.current = atBottom;
    setShowBackToBottom(!atBottom && itemCountRef.current > 0);
  }, []);

  React.useEffect(() => {
    if (itemCount <= 0) {
      initializedRef.current = false;
      previousItemCountRef.current = 0;
      isAtBottomRef.current = true;
      setShowBackToBottom(false);
      return;
    }

    const previousItemCount = previousItemCountRef.current;
    const itemCountIncreased = itemCount > previousItemCount;
    previousItemCountRef.current = itemCount;

    if (!initializedRef.current) {
      initializedRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      return;
    }

    if (itemCountIncreased && isAtBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [itemCount, scrollToBottom]);

  return {
    handleScroll,
    scrollToBottom,
    showBackToBottom,
    virtuosoRef,
  } as const;
}

interface DemoChatMessageBubbleProps extends DemoChatMessage {
  renderMode: MessageRenderMode;
}

function DemoChatMessageBubble({
  content,
  id,
  loading = false,
  name,
  renderMode,
  role,
}: DemoChatMessageBubbleProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const isError = role === "error";

  const bubbleClass = clsx("flex min-w-20 flex-col rounded-lg px-2 py-1 shadow-md", {
    "bg-cyan-50/80 shadow-cyan-300/50 dark:bg-cyan-900/80": isUser,
    "bg-primary-50/80 shadow-primary-300/50 dark:bg-primary-900/80": isAssistant,
    "bg-violet-50/80 shadow-violet-300/50 dark:bg-violet-900/80": isError,
  });

  const textClass = clsx(
    "prose stream-prose max-w-none break-words text-xs dark:prose-invert sm:text-base",
    {
      "text-primary-700 dark:text-primary-200": isAssistant,
      "text-violet-500": isError,
    }
  );

  const plainTextClass = clsx(
    "mt-1 whitespace-pre-wrap break-words text-xs leading-6 sm:text-base",
    {
      "text-neutral-800 dark:text-neutral-100": isUser,
      "text-primary-700 dark:text-primary-200": isAssistant,
      "text-violet-500": isError,
    }
  );

  const wrapperClass = clsx({
    "ml-12 flex flex-row-reverse": isUser,
    "mr-12 flex": isAssistant || isError,
  });

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}>
        <span
          className={clsx("text-xs font-normal", {
            "text-cyan-400/90 dark:text-cyan-600/90": isUser,
            "text-primary-400/90 dark:text-primary-600/90": isAssistant,
            "text-violet-400/90 dark:text-violet-600/90": isError,
          })}
        >
          {name}
        </span>

        {loading ? (
          <div className="mt-1 animate-pulse">...</div>
        ) : renderMode === "plain-text" ? (
          <pre className={plainTextClass}>{content}</pre>
        ) : (
          <MarkdownRenderer
            cacheKey={id}
            className={textClass}
            content={content}
            fallbackMode="plain-text"
          />
        )}
      </div>
    </div>
  );
}

const MemoizedDemoChatMessageBubble = React.memo(
  DemoChatMessageBubble,
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.role === next.role &&
    prev.loading === next.loading &&
    prev.renderMode === next.renderMode &&
    prev.content === next.content
);

interface DemoVirtualChatListProps {
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  items: DemoChatMessage[];
  onRangeChanged: (range: ListRange) => void;
  renderMode: MessageRenderMode;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  showBackToBottom: boolean;
  virtuosoRef: React.RefObject<VirtuosoLiteHandle | null>;
}

function DemoVirtualChatList({
  handleScroll,
  items,
  onRangeChanged,
  renderMode,
  scrollToBottom,
  showBackToBottom,
  virtuosoRef,
}: DemoVirtualChatListProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <VirtuosoLite
        ref={virtuosoRef}
        className={styles.chatScroller}
        computeItemKey={(_index, item) => item?.id ?? _index}
        data={items}
        defaultItemHeight={88}
        increaseViewportBy={{ bottom: 320, top: 160 }}
        initialTopMostItemIndex={
          items.length > 0 ? { align: "end", index: items.length - 1 } : undefined
        }
        itemContent={(_index, item) =>
          item ? (
            <div className="px-2 py-1">
              <MemoizedDemoChatMessageBubble {...item} renderMode={renderMode} />
            </div>
          ) : null
        }
        onRangeChanged={onRangeChanged}
        onScroll={handleScroll}
        overscan={{ main: 320, reverse: 120 }}
        style={{ height: "100%", width: "100%" }}
      />

      {showBackToBottom && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10">
          <button
            aria-label="回到底部"
            className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-600/90 px-3 text-xs font-medium text-white shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 dark:bg-primary-400/90 dark:text-neutral-900 dark:hover:bg-primary-300"
            onClick={() => scrollToBottom("smooth")}
            type="button"
          >
            回到底部
          </button>
        </div>
      )}
    </div>
  );
}

export default function VirtuosoLiteChatDemo() {
  const [messages, setMessages] = React.useState<DemoChatMessage[]>(() => INITIAL_MESSAGES);
  const [messageInput, setMessageInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const [renderMode, setRenderMode] = React.useState<MessageRenderMode>("markdown");
  const [sending, setSending] = React.useState(false);
  const [pendingReplyId, setPendingReplyId] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<ListRange>({ endIndex: 0, startIndex: 0 });
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const nextIdRef = React.useRef(INITIAL_MESSAGES.length + 1);
  const replyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const listItems = React.useMemo(() => {
    if (!sending || !pendingReplyId) {
      return messages;
    }

    return [
      ...messages,
      {
        content: "",
        id: pendingReplyId,
        loading: true,
        name: "爱丽",
        role: "assistant" as const,
      },
    ];
  }, [messages, pendingReplyId, sending]);

  const { handleScroll, scrollToBottom, showBackToBottom, virtuosoRef } = useVirtuosoLiteChatScroll(
    listItems.length
  );

  const createId = React.useCallback((prefix: string) => {
    const nextId = nextIdRef.current;
    nextIdRef.current += 1;
    return `${prefix}-${nextId}`;
  }, []);

  React.useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  const resetMessages = React.useCallback(() => {
    if (replyTimerRef.current !== null) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }

    setSending(false);
    setPendingReplyId(null);
    setMessages(INITIAL_MESSAGES);
    setRange({ endIndex: 0, startIndex: 0 });
    requestAnimationFrame(() => {
      scrollToBottom("auto");
      textareaRef.current?.focus();
    });
  }, [scrollToBottom]);

  const appendLongAssistantMessage = React.useCallback(() => {
    setMessages((current) => [
      ...current,
      {
        content: buildLongAssistantNote(current.length),
        id: createId("assistant"),
        name: "爱丽",
        role: "assistant",
      },
    ]);

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [createId, scrollToBottom]);

  const handleSend = React.useCallback(() => {
    if (isComposing || sending) {
      return;
    }

    const text = messageInput.trim();

    if (!text) {
      return;
    }

    const responseId = createId("assistant-pending");

    setMessages((current) => [
      ...current,
      {
        content: text,
        id: createId("user"),
        name: "user",
        role: "user",
      },
    ]);
    setMessageInput("");
    setPendingReplyId(responseId);
    setSending(true);

    if (replyTimerRef.current !== null) {
      clearTimeout(replyTimerRef.current);
    }

    replyTimerRef.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          content: buildMockReply(text, current.length),
          id: createId("assistant"),
          name: "爱丽",
          role: "assistant",
        },
      ]);
      setPendingReplyId(null);
      setSending(false);
      replyTimerRef.current = null;
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }, 420);
  }, [createId, isComposing, messageInput, sending]);

  return (
    <section className="mt-10 rounded-2xl border border-primary-200/30 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-primary-400/20 dark:bg-primary-950/20 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">VirtuosoLite AI Chat Demo</h2>
          <p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
            这个聊天框复制了 `ai-chat` 的视觉结构，但已经切断原有业务链路，只使用本地 mock
            数组和新的 `VirtuosoLite` 组件进行调试。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-900/70">
            消息数 {listItems.length}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-900/70">
            渲染范围 {range.startIndex} - {range.endIndex}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-900/70">
            数据源 mock-only
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-900/70">
            渲染 {renderMode === "markdown" ? "markdown" : "plain-text"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-neutral-100/80 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-200">
        <label className="inline-flex items-center gap-2">
          <Checkbox
            checked={renderMode === "plain-text"}
            onChange={(event) => {
              setRenderMode(event.target.checked ? "plain-text" : "markdown");
            }}
          />
          <span>纯文本对照模式</span>
        </label>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          开启后跳过 `MarkdownRenderer`，直接用 `&lt;pre&gt;`
          渲染原始文本，便于对比滚动体验是否立刻变稳。
        </span>
      </div>

      <div className="mt-4 flex h-[78dvh] min-h-[640px] w-full min-w-0 flex-col items-center lg:h-[720px]">
        <div className="h-full min-h-0 w-full max-w-[960px] rounded-xl border-4 border-primary-200/20 bg-primary-50/50 backdrop-blur-md dark:border-primary-400/20 dark:bg-primary-950/70">
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="flex-1 min-h-0 px-2 py-2">
              <DemoVirtualChatList
                handleScroll={handleScroll}
                items={listItems}
                onRangeChanged={setRange}
                renderMode={renderMode}
                scrollToBottom={scrollToBottom}
                showBackToBottom={showBackToBottom}
                virtuosoRef={virtuosoRef}
              />
            </div>

            <div className="flex flex-col gap-2 p-2">
              <div className="flex flex-col">
                <div className="rounded-xl bg-primary-200/20 focus-within:ring-2 focus-within:ring-primary-400/40 dark:bg-primary-400/20 dark:focus-within:ring-primary-300/40">
                  <Textarea
                    ref={textareaRef}
                    className={`bg-transparent text-base ${styles.scrollbarHidden}`}
                    disabled={sending}
                    focusStyle="none"
                    onChange={(event) => setMessageInput(event.target.value)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onCompositionStart={() => setIsComposing(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="输入消息，按 Enter 发送（Shift+Enter 换行）"
                    value={messageInput}
                  />

                  <div className="flex items-center justify-between gap-3 px-2 py-2">
                    <span className="text-xs text-primary-700/80 dark:text-primary-200/80">
                      当前不会发送真实请求，仅用于调试新的虚拟滚动组件。
                    </span>

                    <div className="flex gap-1">
                      <Button
                        aria-label="追加长消息"
                        iconOnly
                        intent="subtle"
                        onClick={appendLongAssistantMessage}
                        title="追加长消息"
                        type="button"
                      >
                        <Icon icon={Sparkles} size="sm" />
                      </Button>
                      <Button
                        aria-label="重置消息"
                        iconOnly
                        intent="default"
                        onClick={resetMessages}
                        title="重置消息"
                        type="button"
                      >
                        <Icon icon={RefreshCcw} size="sm" />
                      </Button>
                      <Button
                        aria-label="发送"
                        disabled={sending || !messageInput.trim()}
                        iconOnly
                        intent="primary"
                        onClick={handleSend}
                        title="发送"
                        type="button"
                      >
                        <Icon icon={Send} size="sm" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
