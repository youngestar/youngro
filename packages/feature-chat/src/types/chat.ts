export type MessageRole = "system" | "assistant" | "user" | "tool" | "error";

export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string | unknown[];
  timestamp?: string;
}

export interface ChatSliceText {
  type: "text";
  text: string;
}

export interface ChatSliceToolCall {
  type: "tool-call";
  toolCall: unknown;
}

export interface ChatSliceToolResult {
  type: "tool-call-result";
  id: string;
  result?: unknown;
}

export type ChatSlice = ChatSliceText | ChatSliceToolCall | ChatSliceToolResult;

export interface AssistantMessage extends BaseMessage {
  slices?: ChatSlice[];
  tool_results?: { id: string; result?: unknown }[];
}

export type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCall: unknown }
  | { type: "tool-result"; toolCallId: string; result?: unknown }
  | { type: "finish" }
  | { type: "error"; error: unknown };
