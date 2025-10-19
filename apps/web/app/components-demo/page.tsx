"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  Textarea,
  Checkbox,
  Radio,
  Field,
  Select,
  HeadlessSelect,
} from "@repo/ui";

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
    </div>
  );
}
