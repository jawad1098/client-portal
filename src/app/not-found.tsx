import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <Image
        src="/brand/builtbyjawad-wordmark-dark.svg"
        alt="builtbyjawad"
        width={180}
        height={28}
        className="mb-8"
      />
      <h1 className="text-3xl text-ink">
        404<span className="brand-dot">.</span>
      </h1>
      <p className="mt-3 max-w-sm text-sm text-slate">
        This page got lost on the way to a job site. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
      >
        Back to home
      </Link>
    </div>
  );
}
