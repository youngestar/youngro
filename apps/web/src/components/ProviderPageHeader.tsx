"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@repo/ui";

export interface ProviderPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  backHref?: string;
}

export default function ProviderPageHeader({
  title,
  subtitle,
  icon,
  backHref,
}: ProviderPageHeaderProps) {
  const router = useRouter();

  const titleNode = (
    <div className="inline-flex items-center gap-3">
      {icon ? <span className="inline-flex items-center">{icon}</span> : null}
      <span>{title}</span>
    </div>
  );

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

  return (
    <PageHeader
      title={titleNode}
      subtitle={subtitle}
      showBackButton
      onBack={handleBack}
    />
  );
}
