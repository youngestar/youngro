"use client";

import React from "react";
import { Button, Input, Icon, HeadlessSelect } from "@repo/ui";
import { Search } from "lucide-react";

export interface ToolbarProps {
  onCreate: () => void;
  onImport: (files: FileList) => void;
  onExportActive?: () => void;
  onExportAll?: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  sort: "nameAsc" | "nameDesc" | "recent";
  onSortChange: (v: "nameAsc" | "nameDesc" | "recent") => void;
}

export function Toolbar({
  onCreate,
  onImport,
  onExportActive,
  onExportAll,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: ToolbarProps) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* 左侧：主操作按钮 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button intent="primary" onClick={onCreate}>
          新建卡片
        </Button>
        <Button
          onClick={() => fileRef.current?.click()}
          title="从 JSON 导入卡片"
        >
          导入
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0)
              onImport(e.target.files);
            // 允许选择同一个文件时也能再次触发
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <Button onClick={onExportActive} disabled={!onExportActive}>
          导出当前
        </Button>
        <Button onClick={onExportAll} disabled={!onExportAll}>
          导出全部
        </Button>
      </div>

      {/* 右侧：搜索 + 排序 */}
      <div className="flex w-full items-center gap-3 lg:w-auto">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon icon={Search} size="sm" />
            </div>
            <Input
              tone="plain"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索名称或描述…"
              className="pl-10"
            />
          </div>
        </div>
        {(() => {
          const noIcon = { showIcon: false } as unknown as React.ComponentProps<
            typeof HeadlessSelect
          >;
          return (
            <HeadlessSelect
              value={sort}
              onValueChange={(v) =>
                onSortChange(v as "nameAsc" | "nameDesc" | "recent")
              }
              className="w-[132px] shrink-0"
              {...noIcon}
              options={[
                { value: "nameAsc", label: "名称升序" },
                { value: "nameDesc", label: "名称降序" },
                { value: "recent", label: "最近添加" },
              ]}
            />
          );
        })()}
      </div>
    </div>
  );
}
