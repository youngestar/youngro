"use client";

import { PageHeader } from "@youngro/ui";
import { ClientConsciousnessPage } from "./ClientConsciousnessPage";
import { useRouter } from "next/navigation";

export default function ConsciousnessPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col p-6">
      <PageHeader
        title="意识模块"
        subtitle="consciousness"
        showBackButton
        onBack={() => router.replace("/settings/modules")}
      />
      <ClientConsciousnessPage />
    </div>
  );
}
