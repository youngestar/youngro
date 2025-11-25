import { notFound } from "next/navigation";
import ClientSpeechProviderDetail from "./ClientSpeechProviderDetail";
import { audioSpeechProviders } from "../../../../../src/data/settings/providers";

export async function generateStaticParams() {
  return audioSpeechProviders.map((provider) => ({ id: provider.id }));
}

export default async function SpeechProviderDetail({
  params,
}: {
  params?: Promise<{ id: string }>;
}) {
  const resolved = await params;
  if (!resolved) return notFound();
  const { id } = resolved;
  const exists = audioSpeechProviders.some((provider) => provider.id === id);
  if (!exists) notFound();

  return <ClientSpeechProviderDetail id={id} />;
}
