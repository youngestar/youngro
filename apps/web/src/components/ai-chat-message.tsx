"use client";

export interface AiChatMessageProps {
  name: string;

  content: string;

  role?: "user" | "assistant" | "error";
}

export default function AiChatMessage({
  name,
  content,
  role = "user",
}: AiChatMessageProps) {
  if (role === "error") {
    return (
      <div className="flex mr-12">
        <div className="flex flex-col shadow-md min-w-20 rounded-lg px-2 py-1 bg-violet-50/80 dark:bg-violet-900/80">
          <div className="flex gap-2">
            <span className="text-xs text-violet-400/90 dark:text-violet-600/90">
              error
            </span>
            <div className="text-violet-500">⚠️</div>
          </div>
          <MarkdownRenderer
            content={content as string}
            className="break-words text-violet-500 text-sm"
          />
        </div>
      </div>
    );
  }

  // 🧩 助手消息
  if (role === "assistant" && content !== "") {
    return (
      <div className="flex mr-12">
        <div className="flex flex-col shadow-sm min-w-20 rounded-lg px-2 py-1 bg-primary-50/80 dark:bg-primary-900/80">
          <span className="text-xs text-primary-400/90 dark:text-primary-600/90">
            {name}
          </span>
          <div className="break-words text-primary-700 dark:text-primary-200">
            <MarkdownRenderer content={content} />
          </div>
        </div>
      </div>
    );
  }

  // 🧩 用户消息
  if (role === "user") {
    return (
      <div className="flex flex-row-reverse ml-12">
        <div className="flex flex-col shadow-sm min-w-20 rounded-lg px-2 py-1 bg-cyan-50/80 dark:bg-cyan-900/80">
          <span className="text-xs text-cyan-400/90 dark:text-cyan-600/90">
            {name}
          </span>
          <MarkdownRenderer
            content={content as string}
            className="break-words text-base"
          />
        </div>
      </div>
    );
  }
}
