export type MessageRole = "system" | "assistant" | "user" | "tool" | "error";

export interface BaseMessage {
  id: string;
  role: MessageRole;
  content: string | any[];
  timestamp?: string;
}

export interface ChatSliceText {
  type: "text";
  text: string;
}

export interface ChatSliceToolCall {
  type: "tool-call";
  toolCall: any;
}

export interface ChatSliceToolResult {
  type: "tool-call-result";
  id: string;
  result?: any;
}

export type ChatSlice = ChatSliceText | ChatSliceToolCall | ChatSliceToolResult;

export interface AssistantMessage extends BaseMessage {
  slices?: ChatSlice[];
  tool_results?: { id: string; result?: any }[];
}

export type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; toolCall: any }
  | { type: "tool-result"; toolCallId: string; result?: any }
  | { type: "finish" }
  | { type: "error"; error: any };
