"use client";

import Image from "next/image";
import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        Oops<span className="brand-dot">.</span>
      </h1>
      <p className="mt-3 max-w-sm text-sm text-slate">
        Something broke on our end — not yours. Give it another go.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-slate underline hover:text-ink">
          Back to home
        </Link>
      </div>
    </div>
  );
}
