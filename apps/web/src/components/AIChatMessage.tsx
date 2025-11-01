// HMR test: touch from web component to observe compile log
"use client";

/**
 * 单条聊天消息气泡
 * - 支持三种角色：user / assistant / error（决定配色与对齐）。
 * - content 支持纯文本（Markdown 渲染）或图文混排（text / image_url 数组）。
 * - loading 为真时展示占位内容（流式开头尚无文本）。
 */

import MarkdownRenderer from "./MarkdownRenderer";
import clsx from "clsx";
import Image from "next/image";

export interface CommonContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface AiChatMessageProps {
  name: string;
  role: "user" | "assistant" | "error";
  content: string | CommonContentPart[];
  loading?: boolean;
}

export default function AiChatMessage({
  name,
  role,
  content,
  loading = false,
}: AiChatMessageProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const isError = role === "error";

  const bubbleClass = clsx(
    "flex flex-col shadow-sm min-w-20 rounded-lg px-2 py-1 shadow-md",
    {
      "bg-cyan-50/80 dark:bg-cyan-900/80 shadow-cyan-300/50": isUser,
      "bg-primary-50/80 dark:bg-primary-900/80 shadow-primary-300/50":
        isAssistant,
      "bg-violet-50/80 dark:bg-violet-900/80 shadow-violet-300/50": isError,
    }
  );

  const textClass = clsx(
    "prose stream-prose dark:prose-invert max-w-none break-words text-xs sm:text-base",
    {
      "text-primary-700 dark:text-primary-200": isAssistant,
      "text-violet-500": isError,
    }
  );

  const wrapperClass = clsx({
    "flex flex-row-reverse ml-12": isUser,
    "flex mr-12": isAssistant || isError,
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
          <div className="animate-pulse mt-1">...</div>
        ) : Array.isArray(content) ? (
          <div className="flex flex-col gap-2 mt-1">
            {content.map((part, i) =>
              part.type === "text" ? (
                <MarkdownRenderer
                  key={i}
                  content={part.text || ""}
                  className={textClass}
                />
              ) : (
                <Image
                  key={i}
                  alt="error"
                  src={part.image_url?.url as string}
                  className="max-w-full rounded-lg"
                />
              )
            )}
          </div>
        ) : (
          <MarkdownRenderer content={content} className={textClass} />
        )}
      </div>
    </div>
  );
}
