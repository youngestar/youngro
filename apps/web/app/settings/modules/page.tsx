"use client";

import { IconStatusItem, PageHeader } from "@repo/ui";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useModulesList } from "../../../src/hooks/useModulesList";

export default function SettingsModulesPage() {
  const router = useRouter();
  const { modulesList } = useModulesList();

  return (
    <section className={styles.page}>
      <PageHeader
        title="模块"
        subtitle="Modules"
        showBackButton
        onBack={() => router.back()}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modulesList.map((module, index) => {
          const ModuleIcon = module.icon;

          return (
            <IconStatusItem
              key={module.id}
              href={module.href}
              title={module.name}
              description={module.description}
              icon={
                ModuleIcon ? (
                  <ModuleIcon className="h-full w-full" />
                ) : undefined
              }
              iconColorClassName={module.iconColorClassName}
              iconImageSrc={module.iconImageSrc}
              configured={module.configured}
              className={styles.moduleCard}
              style={{ animationDelay: `${index * 60}ms` }}
            />
          );
        })}
      </div>

      <div className={styles.layerIcon} aria-hidden>
        <div className="i-solar-layers-bold-duotone" />
      </div>
    </section>
  );
}
