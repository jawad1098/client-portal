import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "CLIENT" ? "/portal" : "/admin");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-ink py-8">
        <div className="mx-auto max-w-md px-6">
          <Image
            src="/brand/builtbyjawad-wordmark-light.svg"
            alt="builtbyjawad"
            width={180}
            height={28}
            priority
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl text-ink">
            Client portal<span className="brand-dot">.</span>
          </h1>
          <p className="mt-1 mb-6 text-sm text-slate">
            Sign in with the email and password you were given.
          </p>

          <LoginForm callbackUrl={params.callbackUrl} />
        </div>
      </main>
    </div>
  );
}
