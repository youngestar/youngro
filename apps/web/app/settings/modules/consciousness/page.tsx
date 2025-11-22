"use client";

import { PageHeader } from "@repo/ui";
import { ClientConsciousnessPage } from "./ClientConsciousnessPage";
import { useRouter } from "next/navigation";

export default function ConsciousnessPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="意识模块"
        subtitle="consciousness"
        showBackButton
        onBack={() => router.back()}
      />
      <ClientConsciousnessPage />
    </div>
  );
}
