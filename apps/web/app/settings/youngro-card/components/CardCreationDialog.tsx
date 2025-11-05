"use client";

import React from "react";
import { Button, Field, Input, Textarea } from "@repo/ui";
import { SimpleModal } from "./SimpleModal";

export interface CardCreationValues {
  name: string;
  nickname?: string;
  version: string;
  description: string;
  personality: string;
  scenario: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  greetings: string[];
  notes?: string;
}

export function CardCreationDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CardCreationValues) => void;
}) {
  const [values, setValues] = React.useState<CardCreationValues>(() => ({
    name: "relu",
    nickname: "",
    version: "1.0.0",
    description: "",
    personality: "性格开朗，乐于助人，逻辑清晰，简洁回答。",
    scenario: "你是我的 AI 助理，与我在日常工作中协作。",
    systemPrompt: "You are ReLU. Be helpful and concise.",
    postHistoryInstructions: "在阅读完整对话后再作答，尽可能简洁。",
    greetings: ["你好！", "很高兴见到你。"],
    notes: "",
  }));
  const [submitting, setSubmitting] = React.useState(false);
  const [tab, setTab] = React.useState<"identity" | "behavior" | "settings">(
    "identity"
  );
  const [error, setError] = React.useState<string>("");

  const nameInvalid = values.name.trim().length === 0;
  const versionInvalid = !/^(?:\d+\.)+\d+$/.test(values.version.trim());
  const requiredMissing = [
    values.description,
    values.personality,
    values.scenario,
    values.systemPrompt,
    values.postHistoryInstructions,
  ].some((s) => s.trim().length === 0);

  React.useEffect(() => {
    if (open) {
      setValues({
        name: "relu",
        nickname: "",
        version: "1.0.0",
        description: "",
        personality: "性格开朗，乐于助人，逻辑清晰，简洁回答。",
        scenario: "你是我的 AI 助理，与我在日常工作中协作。",
        systemPrompt: "You are ReLU. Be helpful and concise.",
        postHistoryInstructions: "在阅读完整对话后再作答，尽可能简洁。",
        greetings: ["你好！", "很高兴见到你。"],
        notes: "",
      });
      setSubmitting(false);
      setTab("identity");
      setError("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (nameInvalid) {
      setError("名称为必填项");
      setTab("identity");
      return;
    }
    if (versionInvalid) {
      setError("版本号格式需为 1.0 或 1.0.0 之类");
      setTab("settings");
      return;
    }
    if (requiredMissing) {
      setError("请填写所有必填项");
      return;
    }
    setSubmitting(true);
    onSubmit(values);
    setSubmitting(false);
    onClose();
  };

  return (
    <SimpleModal
      open={open}
      onClose={onClose}
      title="新建卡片"
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={onClose} intent="default">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={nameInvalid || versionInvalid || submitting}
          >
            创建
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="mb-2 flex items-center gap-2">
          {[
            { id: "identity", label: "身份" },
            { id: "behavior", label: "行为" },
            { id: "settings", label: "设置" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`rounded px-3 py-1 text-sm ${
                tab === (t.id as typeof tab)
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {tab === "identity" && (
          <div className="space-y-4">
            <Field label={"名称（必填）"}>
              <Input
                tone="plain"
                value={values.name}
                onChange={(e) =>
                  setValues((v) => ({ ...v, name: e.target.value }))
                }
                placeholder="例如：ReLU"
                className={nameInvalid ? "border-red-300" : undefined}
              />
              {nameInvalid && (
                <p className="mt-1 text-xs text-red-600">名称为必填项</p>
              )}
            </Field>
            <Field label="昵称（可选）">
              <Input
                tone="plain"
                value={values.nickname ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, nickname: e.target.value }))
                }
                placeholder="例如：小蓝"
              />
            </Field>
            <Field label={"描述（必填）"}>
              <Textarea
                tone="plain"
                value={values.description}
                onChange={(e) =>
                  setValues((v) => ({ ...v, description: e.target.value }))
                }
                rows={3}
                className={
                  values.description.trim() === ""
                    ? "border-red-300"
                    : undefined
                }
              />
              {values.description.trim() === "" && (
                <p className="mt-1 text-xs text-red-600">描述为必填项</p>
              )}
            </Field>
            <Field label="创作者备注（可选）">
              <Textarea
                tone="plain"
                value={values.notes ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, notes: e.target.value }))
                }
                rows={3}
              />
            </Field>
          </div>
        )}

        {tab === "behavior" && (
          <div className="space-y-4">
            <Field label={"性格 (Personality)（必填）"}>
              <Textarea
                tone="plain"
                value={values.personality}
                onChange={(e) =>
                  setValues((v) => ({ ...v, personality: e.target.value }))
                }
                rows={4}
                className={
                  values.personality.trim() === ""
                    ? "border-red-300"
                    : undefined
                }
              />
              {values.personality.trim() === "" && (
                <p className="mt-1 text-xs text-red-600">性格为必填项</p>
              )}
            </Field>
            <Field label={"场景 (Scenario)（必填）"}>
              <Textarea
                tone="plain"
                value={values.scenario}
                onChange={(e) =>
                  setValues((v) => ({ ...v, scenario: e.target.value }))
                }
                rows={4}
                className={
                  values.scenario.trim() === "" ? "border-red-300" : undefined
                }
              />
              {values.scenario.trim() === "" && (
                <p className="mt-1 text-xs text-red-600">场景为必填项</p>
              )}
            </Field>
            <Field label="问候语 (每行一条)">
              <Textarea
                tone="plain"
                value={values.greetings.join("\n")}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    greetings: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                rows={4}
                placeholder={"你好！\n很高兴见到你。"}
              />
            </Field>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <Field label={"系统提示 (System Prompt)（必填）"}>
              <Textarea
                tone="plain"
                value={values.systemPrompt}
                onChange={(e) =>
                  setValues((v) => ({ ...v, systemPrompt: e.target.value }))
                }
                rows={5}
                placeholder="You are ReLU. Be helpful and concise."
                className={
                  values.systemPrompt.trim() === ""
                    ? "border-red-300"
                    : undefined
                }
              />
              {values.systemPrompt.trim() === "" && (
                <p className="mt-1 text-xs text-red-600">系统提示为必填项</p>
              )}
            </Field>
            <Field label={"历史后提示 (Post History Instructions)（必填）"}>
              <Textarea
                tone="plain"
                value={values.postHistoryInstructions}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    postHistoryInstructions: e.target.value,
                  }))
                }
                rows={4}
                className={
                  values.postHistoryInstructions.trim() === ""
                    ? "border-red-300"
                    : undefined
                }
              />
              {values.postHistoryInstructions.trim() === "" && (
                <p className="mt-1 text-xs text-red-600">历史后提示为必填项</p>
              )}
            </Field>
            <Field label={"版本（必填）"}>
              <Input
                tone="plain"
                value={values.version}
                onChange={(e) =>
                  setValues((v) => ({ ...v, version: e.target.value }))
                }
                placeholder="1.0 或 1.0.0"
                className={versionInvalid ? "border-red-300" : undefined}
              />
              {versionInvalid && (
                <p className="mt-1 text-xs text-red-600">
                  版本号格式需为 1.0 或 1.0.0
                </p>
              )}
            </Field>
          </div>
        )}
      </div>
    </SimpleModal>
  );
}
