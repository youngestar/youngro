"use client";

import ClientProviderDetail from "../../components/ClientProviderDetail";

interface Props {
  id: string;
}

export default function ClientSpeechProviderDetail({ id }: Props) {
  return <ClientProviderDetail category="speech" id={id} />;
}
