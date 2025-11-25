"use client";

import { PageHeader } from "@repo/ui";
import { useRouter } from "next/navigation";
import { ClientSpeechPage } from "./ClientSpeechPage";

export default function ConsciousnessPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col p-6">
      {" "}
      <PageHeader
        title="发声模块"
        subtitle="speech"
        showBackButton
        onBack={() => router.back()}
      />
      <ClientSpeechPage />
    </div>
  );
}
