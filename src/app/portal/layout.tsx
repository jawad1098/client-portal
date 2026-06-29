import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { CommandPalette } from "@/components/command-palette";
import { PortalMobileNav } from "@/components/portal-mobile-nav";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/resources", label: "Resources" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/billing", label: "Billing" },
  { href: "/portal/support", label: "Support" },
  { href: "/portal/book", label: "Book a meeting" },
  { href: "/account", label: "Account" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
  });

  if (!client) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="bg-ink py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/brand/builtbyjawad-wordmark-light.svg" alt="builtbyjawad" width={150} height={24} />
              <span className="text-xs uppercase tracking-wider text-mist">&middot; client portal</span>
            </div>
            <h1 className="mt-1 text-xl text-paper md:text-2xl">{client.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="status-pill">{client.status}</span>
            <CommandPalette role="CLIENT" triggerVariant="icon" />
            <NotificationBell variant="dark" />
            <PortalMobileNav items={NAV_ITEMS} />
            <SignOutButton className="text-sm text-paper/80 underline hover:text-white" />
          </div>
        </div>
        <nav className="mx-auto mt-4 hidden max-w-4xl flex-wrap gap-4 px-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-paper/80 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {session.user.impersonatorId && (
        <ImpersonationBanner viewingAs={`${session.user.name} (client at ${client.name})`} />
      )}

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
