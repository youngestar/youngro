import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] place-content-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-semibold">页面不见了（404）</h1>
      <p className="text-sm opacity-70">你访问的页面不存在或已被移动。</p>
      <div className="mt-4">
        <Link href="/" className="underline underline-offset-4">
          返回首页
        </Link>
      </div>
    </section>
  );
}
