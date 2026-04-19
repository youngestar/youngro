type ScrollAlign = "center" | "end" | "start";
type ScrollBehavior = "auto" | "smooth";

export interface ItemLocation {
  align?: ScrollAlign;
  behavior?: ScrollBehavior;
  index: number;
  offset?: number;
}

export type ScrollTaskReason = string;

export interface ScrollTask {
  attempts: number;
  cancelledByUser: boolean;
  finishedAt: number | null;
  id: number;
  reason: ScrollTaskReason;
  startedAt: number;
  status: "aligning" | "cancelled" | "failed" | "pending" | "settled";
  target: {
    align?: ScrollAlign;
    behavior: ScrollBehavior;
    index: number;
    offset: number;
  };
}

function normalizeItemLocation(target: ItemLocation): ScrollTask["target"] {
  return {
    align: target.align,
    behavior: target.behavior ?? "auto",
    index: target.index,
    offset: target.offset ?? 0,
  };
}

export function createScrollTask(
  id: number,
  reason: ScrollTaskReason,
  target: ItemLocation,
  timestamp: number
): ScrollTask {
  return {
    attempts: 0,
    cancelledByUser: false,
    finishedAt: null,
    id,
    reason,
    startedAt: timestamp,
    status: "pending",
    target: normalizeItemLocation(target),
  };
}

export function markTaskAligning(task: ScrollTask): ScrollTask {
  return { ...task, status: "aligning" };
}

export function markTaskSettled(task: ScrollTask, timestamp: number): ScrollTask {
  return { ...task, finishedAt: timestamp, status: "settled" };
}

export function markTaskFailed(task: ScrollTask, timestamp: number): ScrollTask {
  return { ...task, finishedAt: timestamp, status: "failed" };
}

export function cancelTask(
  task: ScrollTask,
  timestamp: number,
  cancelledByUser = false
): ScrollTask {
  return {
    ...task,
    cancelledByUser,
    finishedAt: timestamp,
    status: "cancelled",
  };
}
