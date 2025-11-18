"use client";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";

export default function NotFound() {
  const router = useRouter();
  return (
    <section className="mx-auto grid min-h-[60vh] place-content-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold">页面不见了（404）</h1>
      <p className="text-sm opacity-70">你访问的页面不存在或已被移动。</p>
      <div className="mt-4">
        <Button intent="primary" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>
    </section>
  );
}
