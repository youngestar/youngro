"use client";

import { IconItem, Icon, PageHeader } from "@repo/ui";
import styles from "./page.module.css";
import { SmilePlus } from "lucide-react";
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
      </main>
    </div>
  );
}
