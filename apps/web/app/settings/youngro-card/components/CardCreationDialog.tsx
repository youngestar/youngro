"use client";

import React from "react";
import { Button, Field, Input, Textarea, Icon } from "@repo/ui";
import { SimpleModal } from "./SimpleModal";
import {
  User,
  Brain,
  Settings as SettingsIcon,
  Eye,
  Undo2,
} from "lucide-react";
import { CardDetailsPanel } from "@youngro/feature-youngro-card";

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
    description: "AI 助手",
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
  const [previewTab, setPreviewTab] = React.useState<"details" | "modules">(
    "details"
  );

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
      title={
        <span className="from-primary-500 to-primary-400 bg-gradient-to-r bg-clip-text text-transparent text-2xl">
          新建卡片
        </span>
      }
      widthClassName="max-w-5xl"
      footer={
        <div className="flex w-full items-center justify-between">
          {/* 进度提示 */}
          <ProgressHint values={values} versionInvalid={versionInvalid} />
          <div className="ml-auto mr-1 flex flex-row gap-2">
            <Button onClick={onClose} intent="default">
              <Icon icon={Undo2} size="sm" className="mr-2" />
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={nameInvalid || versionInvalid || submitting}
              intent="primary"
              icon
            >
              创建
            </Button>
          </div>
        </div>
      }
    >
      <div
        className="space-y-3"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        {/*Dialog tabs*/}
        <div>
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-center -mb-px sm:justify-start space-x-1">
              {(
                [
                  { id: "identity", label: "身份", icon: User },
                  { id: "behavior", label: "行为", icon: Brain },
                  { id: "settings", label: "设置", icon: SettingsIcon },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as typeof tab)}
                    className={`px-4 py-2 text-sm font-medium ${
                      active
                        ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                    }`}
                    role="tab"
                    aria-selected={active}
                  >
                    <div className="flex items-center gap-1">
                      <Icon size={14} />
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {/* 表单 + 右侧预览 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
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
                  <CharCounter value={values.description} limit={400} />
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
                  <CharCounter value={values.notes ?? ""} limit={400} subtle />
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
                  <CharCounter value={values.personality} limit={600} />
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
                      values.scenario.trim() === ""
                        ? "border-red-300"
                        : undefined
                    }
                  />
                  <CharCounter value={values.scenario} limit={600} />
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
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    当前条目：{values.greetings.filter(Boolean).length}
                  </p>
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
                  <CharCounter value={values.systemPrompt} limit={1200} />
                  {values.systemPrompt.trim() === "" && (
                    <p className="mt-1 text-xs text-red-600">
                      系统提示为必填项
                    </p>
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
                  <CharCounter
                    value={values.postHistoryInstructions}
                    limit={800}
                  />
                  {values.postHistoryInstructions.trim() === "" && (
                    <p className="mt-1 text-xs text-red-600">
                      历史后提示为必填项
                    </p>
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
                  {!versionInvalid && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      建议遵循 SemVer：主.次.补丁，例如 1.1.0
                    </p>
                  )}
                </Field>
              </div>
            )}
          </div>
          {/* 右侧预览 */}
          <div className="hidden min-h-full flex-col gap-3 md:flex">
            <div className="flex items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center gap-2">
                <Eye size={14} />
                <span>卡片预览</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="px-4 py-3">
                {/* 使用 feature-youngro-card 中的 CardDetailsPanel 作为真实预览 */}
                <CardDetailsPanel
                  card={{
                    name: values.name || "未命名卡片",
                    version: values.version || "1.0.0",
                    nickname: values.nickname || undefined,
                    description: values.description || undefined,
                    notes: values.notes || undefined,
                    systemPrompt: values.systemPrompt || undefined,
                    personality: values.personality || undefined,
                    scenario: values.scenario || undefined,
                    tags: [],
                    extensions: { youngro: {} },
                  }}
                  tab={previewTab}
                  onChangeTab={(t) => setPreviewTab(t as "details" | "modules")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimpleModal>
  );
}

function countCompletion(values: CardCreationValues, versionInvalid: boolean) {
  const checks = [
    values.name.trim().length > 0,
    values.description.trim().length > 0,
    values.personality.trim().length > 0,
    values.scenario.trim().length > 0,
    values.systemPrompt.trim().length > 0,
    values.postHistoryInstructions.trim().length > 0,
    !versionInvalid,
  ];
  const done = checks.filter(Boolean).length;
  return {
    done,
    total: checks.length,
    percent: Math.round((done / checks.length) * 100),
  };
}

function ProgressHint({
  values,
  versionInvalid,
}: {
  values: CardCreationValues;
  versionInvalid: boolean;
}) {
  const { done, total, percent } = countCompletion(values, versionInvalid);
  return (
    <div className="text-xs text-neutral-600 dark:text-neutral-400">
      完成度 {done}/{total}（{percent}%）
    </div>
  );
}

function CharCounter({
  value,
  limit,
  subtle = false,
}: {
  value: string;
  limit: number;
  subtle?: boolean;
}) {
  const len = value?.length ?? 0;
  const over = len > limit;
  return (
    <div
      className={`mt-1 text-right text-xs ${over ? "text-red-600" : subtle ? "text-neutral-400" : "text-neutral-500"} dark:${over ? "text-red-400" : "text-neutral-400"}`}
    >
      {len}/{limit}
    </div>
  );
}
