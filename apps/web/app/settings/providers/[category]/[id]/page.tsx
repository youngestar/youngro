import { notFound } from "next/navigation";
import ClientProviderDetail from "./ClientProviderDetail";
import { allProviders } from "../../../../../src/data/settings/providers";

export async function generateStaticParams() {
  return allProviders.map((p) => ({ category: p.category, id: p.id }));
}

export default function ProviderDetail({
  params,
}: {
  params: { category: string; id: string };
}) {
  const { category, id } = params;
  const exists = allProviders.some(
    (p) => p.id === id && p.category === category
  );
  if (!exists) notFound();
  return <ClientProviderDetail category={category} id={id} />;
}
