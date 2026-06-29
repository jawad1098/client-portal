import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TeamInviteForm } from "./team-invite-form";
import { ImpersonateButton } from "@/components/impersonate-button";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [team, pendingInvites] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEAM" }, orderBy: { name: "asc" } }),
    prisma.invite.findMany({
      where: { role: "TEAM", status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Team<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">{team.length} team members</p>

      <div className="card mb-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-paper">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium text-ink">{member.name}</td>
                <td className="px-4 py-3 text-slate">{member.email}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-3">
                      <ImpersonateButton targetUserId={member.id} />
                      <Link href={`/admin/team/${member.id}`} className="text-xs font-semibold text-green-dark hover:underline">
                        Edit &rarr;
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pendingInvites.length > 0 && (
        <div className="card mb-6 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate">Pending invites</p>
          <ul className="flex flex-col gap-1 text-sm text-slate">
            {pendingInvites.map((pending) => (
              <li key={pending.id}>
                {pending.name} ({pending.email})
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin ? (
        <TeamInviteForm initialToken={invite} />
      ) : (
        <p className="text-sm text-slate">Only admins can invite new team members.</p>
      )}
    </div>
  );
}
