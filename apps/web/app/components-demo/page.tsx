"use client";

import React, { useState } from "react";
import {
  Button,
  Icon,
  Input,
  Textarea,
  Checkbox,
  Radio,
  Field,
  Select,
  HeadlessSelect,
  ScrollArea,
} from "@repo/ui";
import { Send, Trash2, Play, StopCircle, Check, Pause } from "lucide-react";

export default function ComponentsDemo() {
  const [inputVal, setInputVal] = useState("");
  const [textVal, setTextVal] = useState("");
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState("a");
  const [sel, setSel] = useState("a");
  const [hs, setHs] = useState("a");

  const options = [
    { value: "a", label: "选项 A" },
    { value: "b", label: "选项 B" },
    { value: "c", label: "选项 C" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>组件展示页</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Icon-only Buttons</h2>
        <div className="flex flex-wrap gap-12 items-center">
          <div className="flex items-center gap-3">
            <span className="text-xs w-24 text-neutral-500">intent</span>
            <div className="flex flex-wrap gap-3">
              <Button intent="primary" iconOnly aria-label="发送">
                <Icon icon={Send} />
              </Button>
              <Button intent="default" iconOnly aria-label="删除">
                <Icon icon={Trash2} />
              </Button>
              <Button intent="destructive" iconOnly aria-label="停止">
                <Icon icon={StopCircle} />
              </Button>
              <Button intent="subtle" iconOnly aria-label="确认">
                <Icon icon={Check} />
              </Button>
              <Button intent="default" iconOnly aria-label="暂停" disabled>
                <Icon icon={Pause} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs w-24 text-neutral-500">size</span>
            <div className="flex items-center gap-4">
              <Button
                iconOnly
                size="sm"
                intent="default"
                aria-label="播放（小）"
              >
                <Icon icon={Play} />
              </Button>
              <Button
                iconOnly
                size="md"
                intent="default"
                aria-label="播放（中）"
              >
                <Icon icon={Play} />
              </Button>
              <Button
                iconOnly
                size="lg"
                intent="default"
                aria-label="播放（大）"
              >
                <Icon icon={Play} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Button</h2>
        <Button onClick={() => alert("clicked")}>Primary</Button>
        <Button intent="destructive" style={{ marginLeft: 8 }}>
          Danger
        </Button>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Input</h2>
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="输入一些文本"
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Textarea</h2>
        <Textarea
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          rows={4}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Checkbox / Radio</h2>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          Toggle
        </label>
        <div style={{ marginTop: 8 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Radio
              name="r"
              checked={radio === "a"}
              onChange={() => setRadio("a")}
            />
            Option A
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Radio
              name="r"
              checked={radio === "b"}
              onChange={() => setRadio("b")}
            />
            Option B
          </label>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Field wrapper</h2>
        <Field
          label="用户名"
          help="示例帮助文本"
          error={inputVal.length > 10 ? "太长" : undefined}
        >
          <Input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </Field>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Native Select</h2>
        <Select
          options={options}
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Headless Select (Radix)</h2>
        <HeadlessSelect
          options={options}
          value={hs}
          onValueChange={(v: string) => setHs(v)}
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>ScrollArea</h2>
        <div style={{ height: 120, width: 320 }}>
          <ScrollArea className="rounded-md border h-48">
            <div className="p-2 space-y-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="text-sm">
                  行 {i + 1}：这是一行可滚动的内容
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </section>
    </div>
  );
}
