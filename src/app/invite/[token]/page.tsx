import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "./invite-form";

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({ where: { token } });

  const isExpired = invite ? invite.expiresAt < new Date() : false;
  const isInvalid = !invite || invite.status !== "PENDING" || isExpired;

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
          {isInvalid ? (
            <>
              <h1 className="text-2xl text-ink">
                Invite not valid<span className="brand-dot">.</span>
              </h1>
              <p className="mt-2 text-sm text-slate">
                This invite link has expired, already been used, or doesn&apos;t exist.
                Ask whoever invited you to send a new one.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl text-ink">
                Welcome, {invite!.name}<span className="brand-dot">.</span>
              </h1>
              <p className="mt-1 mb-6 text-sm text-slate">
                Set a password for {invite!.email} to finish setting up your account.
              </p>

              <InviteForm token={token} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
