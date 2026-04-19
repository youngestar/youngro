import { notFound } from "next/navigation";
import ClientProviderDetail from "./ClientProviderDetail";
import { allProviders } from "../../../../../src/data/settings/providers";

export async function generateStaticParams() {
  return allProviders
    .filter((p) => p.category !== "speech")
    .map((p) => ({ category: p.category, id: p.id }));
}

export default async function ProviderDetail({
  params,
}: {
  params?: Promise<{ category: string; id: string }>;
}) {
  const resolved = await params;
  if (!resolved) return notFound();
  const { category, id } = resolved;
  const exists = allProviders.some(
    (p) => p.id === id && p.category === category && p.category !== "speech"
  );
  if (!exists) notFound();
  return <ClientProviderDetail category={category} id={id} />;
}
