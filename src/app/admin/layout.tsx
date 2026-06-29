import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { CommandPalette } from "@/components/command-palette";
import { AdminMobileNav } from "@/components/admin-mobile-nav";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/resources", label: "Resources" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  const canSwitch = isAdmin && !session.user.impersonatorId;

  let switcherClients: { userId: string; label: string; sublabel: string; role: "CLIENT" }[] = [];
  let switcherTeam: { userId: string; label: string; sublabel: string; role: "TEAM" }[] = [];

  if (canSwitch) {
    const [clientUsers, teamUsers] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CLIENT" },
        include: { client: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "TEAM" },
        orderBy: { name: "asc" },
      }),
    ]);

    switcherClients = clientUsers.map((u) => ({
      userId: u.id,
      label: u.client?.name ?? u.name,
      sublabel: `${u.name} · ${u.email}`,
      role: "CLIENT" as const,
    }));
    switcherTeam = teamUsers.map((u) => ({
      userId: u.id,
      label: u.name,
      sublabel: u.email,
      role: "TEAM" as const,
    }));
  }

  const sidebarContent = (
    <>
      <CommandPalette
        role={session.user.role}
        switchTargets={canSwitch ? { clients: switcherClients, team: switcherTeam } : undefined}
      />

      <Image
        src="/brand/builtbyjawad-wordmark-light.svg"
        alt="builtbyjawad"
        width={150}
        height={24}
      />
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[0.7rem] uppercase tracking-wider text-mist">
          Admin
        </p>
        <NotificationBell variant="dark" />
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-paper/90 transition hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        <p className="mb-2 text-xs text-mist">
          {session.user.name} · {session.user.role}
        </p>
        <Link href="/account" className="text-sm text-paper/80 underline hover:text-white">
          Account settings
        </Link>
        <div className="mt-2">
          <SignOutButton className="text-sm text-paper/80 underline hover:text-white" />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-none flex-col bg-ink px-5 py-6 md:flex">
        {sidebarContent}
      </aside>

      <AdminMobileNav>{sidebarContent}</AdminMobileNav>

      <div className="flex flex-1 flex-col">
        {session.user.impersonatorId && (
          <ImpersonationBanner viewingAs={`${session.user.name} (${session.user.role})`} />
        )}
        <main className="flex-1 bg-paper px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
