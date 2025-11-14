"use client";

import React from "react";
import { Input, Icon, HeadlessSelect } from "@repo/ui";
import { Search, ChevronDown } from "lucide-react";

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
  // 左侧主操作按钮已在卡片中实现，这里不再使用这些回调
  // 保留在类型上以避免调用方改动，但不解构为变量以避免未使用告警
  ...props
}: ToolbarProps) {
  const { search, onSearchChange, sort, onSortChange } = props;
  // 左侧按钮删除后无需文件选择器

  return (
    <div className="flex w-full items-center gap-3">
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
          <div className="relative w-[132px] shrink-0">
            <HeadlessSelect
              value={sort}
              onValueChange={(v) =>
                onSortChange(v as "nameAsc" | "nameDesc" | "recent")
              }
              className="w-full"
              {...noIcon}
              options={[
                { value: "nameAsc", label: "名称升序" },
                { value: "nameDesc", label: "名称降序" },
                { value: "recent", label: "最近添加" },
              ]}
            />
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
              <Icon icon={ChevronDown} size="sm" />
            </div>
          </div>
        );
      })()}
      {/* 右侧结束 */}
    </div>
  );
}
