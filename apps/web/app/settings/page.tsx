"use client";

import { IconItem, Icon, PageHeader } from "@repo/ui";
import styles from "./page.module.css";
import { Layers, Package, SmilePlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          title="设置"
          subtitle="Settings"
          showBackButton
          onBack={() => router.back()}
        />
        <div className="flex flex-col gap-4 pb-12">
          <IconItem
            title="角色卡"
            description="管理你的角色卡"
            to="/settings/youngro-card"
            icon="i-solar:settings-bold-duotone" // 字体图标类
            // 或者
            iconTemplate
          >
            <Icon icon={SmilePlus} size={96} className="opacity-50" />
          </IconItem>
          <IconItem
            title="机体模块"
            description="思维, 发声, 记忆等模块设置"
            to="/settings/modules"
            icon="i-solar:settings-bold-duotone" // 字体图标类
            // 或者
            iconTemplate
          >
            <Icon icon={Layers} size={96} className="opacity-50" />
          </IconItem>
          <IconItem
            title="服务来源"
            description="管理 AI 服务来源"
            to="/settings/providers"
            icon="i-solar:settings-bold-duotone" // 字体图标类
            // 或者
            iconTemplate
          >
            <Icon icon={Package} size={96} className="opacity-50" />
          </IconItem>
        </div>
      </main>
    </div>
  );
}
