"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Field, Input, ScrollArea, RadioCard } from "@repo/ui";
import {
  useProvidersStore,
  useProvidersHydrate,
  type ProviderState,
} from "../../../../src/store/providersStore";
import {
  useConsciousnessStore,
  useConsciousnessHydrate,
} from "../../../../src/store/consciousnessStore";

export function ClientConsciousnessPage() {
  useProvidersHydrate();
  useConsciousnessHydrate();

  const providers = useProvidersStore((s) =>
    s.getProvidersByCategory("chat").filter((p: ProviderState) => p.configured)
  );
  const fetchModels = useProvidersStore((s) => s.fetchModels);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  const {
    activeProviderId,
    activeModelId,
    customModelName,
    modelSearchQuery,
    setActiveProvider,
    setActiveModel,
    setCustomModelName,
    setModelSearchQuery,
  } = useConsciousnessStore();

  const activeProvider = useMemo(
    () => providers.find((p) => p.meta.id === activeProviderId),
    [providers, activeProviderId]
  );

  const supportsModelListing = !!activeProvider; // chat providers 视为支持 list models

  const providerModels = activeProvider?.resources.items ?? [];
  const modelsStatus = activeProvider?.resources.status ?? "idle";
  const modelsError = activeProvider?.resources.error ?? null;

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery.trim()) return providerModels;
    const q = modelSearchQuery.trim().toLowerCase();
    return providerModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [providerModels, modelSearchQuery]);

  const displayedModels = showAllModels
    ? filteredModels
    : filteredModels.slice(0, 12);

  const hasConfiguredProviders = providers.length > 0;

  const handleRefreshModels = async () => {
    if (!activeProvider) return;
    setIsRefreshing(true);
    try {
      await fetchModels(activeProvider.meta.id, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl bg-neutral-50 p-4 dark:bg-black/30">
      {/* Provider 选择 */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg text-neutral-500 md:text-2xl dark:text-neutral-500">
            Provider 与模型
          </h2>
          <p className="text-sm text-neutral-400 dark:text-neutral-400">
            先选择一个已经配置好的 Provider，再在下方为其选择默认意识模型。
          </p>
        </div>

        {hasConfiguredProviders ? (
          <ScrollArea className="max-w-full">
            <div className="flex gap-4 p-1">
              {providers.map((provider) => {
                const isActive = provider.meta.id === activeProviderId;
                return (
                  <RadioCard
                    key={provider.meta.id}
                    label={provider.meta.localizedName ?? provider.meta.id}
                    description={provider.meta.localizedDescription}
                    icon={provider.meta.icon}
                    checked={isActive}
                    onChange={() => {
                      setActiveProvider(provider.meta.id);
                      fetchModels(provider.meta.id, false);
                    }}
                    className="min-w-[16rem]"
                  />
                );
              })}

              <Link
                href="/settings/providers"
                className="relative flex min-w-[12rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-100 bg-white p-4 text-sm text-neutral-500 transition-all hover:border-primary-500/40 dark:border-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-400"
              >
                <span className="text-lg font-medium">添加/管理 Provider</span>
                <span className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  跳转到 Provider 设置
                </span>
              </Link>
            </div>
          </ScrollArea>
        ) : (
          <Link
            href="/settings/providers"
            className="flex items-center gap-3 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 transition-colors hover:border-primary-500/40 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <div className="text-2xl">⚠️</div>
            <div className="flex flex-col">
              <span className="font-medium">尚未配置任何 Provider</span>
              <span className="text-sm text-neutral-400 dark:text-neutral-500">
                点击这里前往设置页面，添加你的 LLM 提供者。
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* 模型选择区域 */}
      {activeProvider && supportsModelListing ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg text-neutral-500 md:text-2xl dark:text-neutral-500">
                选择默认模型
              </h2>
              <p className="text-sm text-neutral-400 dark:text-neutral-400">
                为 {activeProvider.meta.localizedName ?? activeProvider.meta.id}{" "}
                选择默认用于意识对话的模型。
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              intent="default"
              onClick={handleRefreshModels}
              disabled={modelsStatus === "loading" || isRefreshing}
            >
              {modelsStatus === "loading" || isRefreshing
                ? "重新拉取中…"
                : "重新拉取模型"}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {modelsStatus === "loading" && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                <span>正在加载可用模型列表……</span>
              </div>
            )}

            {modelsStatus === "error" && modelsError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300">
                {modelsError}
              </div>
            )}

            {modelsStatus === "success" && providerModels.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
                当前 Provider 未返回任何可用模型，请检查其配置或权限。
              </div>
            )}

            {modelsStatus === "success" && providerModels.length > 0 && (
              <>
                <div className="flex flex-col gap-4">
                  <Field label="搜索模型" help="根据名称 / ID 筛选可用模型。">
                    <Input
                      placeholder="搜索模型..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      tone="plain"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {displayedModels.map((model) => (
                      <RadioCard
                        key={model.id}
                        variant="compact"
                        label={model.name}
                        description={model.id}
                        checked={activeModelId === model.id}
                        onChange={() => setActiveModel(model.id)}
                        className="w-full"
                      />
                    ))}
                  </div>

                  {filteredModels.length === 0 && modelSearchQuery && (
                    <div className="py-8 text-center text-sm text-neutral-500">
                      没有找到匹配 「
                      <span className="font-mono">{modelSearchQuery}</span>
                      」的模型。
                    </div>
                  )}

                  {filteredModels.length > 12 && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        intent="subtle"
                        onClick={() => setShowAllModels(!showAllModels)}
                      >
                        {showAllModels
                          ? "收起模型列表"
                          : `显示全部 ${filteredModels.length} 个模型`}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => {
                  // 实际保存逻辑已由 zustand + localStorage 处理
                  // 这里保留 side-effect hook 的扩展点
                  console.log("保存意识配置", {
                    provider: activeProviderId,
                    model: activeModelId,
                    customModelName,
                  });
                }}
                disabled={
                  !activeProviderId || (!activeModelId && !customModelName)
                }
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
