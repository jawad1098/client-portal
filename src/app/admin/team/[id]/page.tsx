import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTeamMember, removeTeamMember } from "@/lib/actions/team";
import { ResetPasswordButton } from "./reset-password-button";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    notFound();
  }

  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { assignedTasks: true } },
    },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "TEAM")) {
    notFound();
  }

  const openTaskCount = await prisma.task.count({
    where: { assigneeId: member.id, status: { not: "DONE" } },
  });

  const updateWithId = updateTeamMember.bind(null, member.id);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin/team" className="text-sm text-green-dark hover:underline">
        &larr; Back to team
      </Link>
      <h1 className="mt-3 text-2xl text-ink">
        {member.name}
        <span className="brand-dot">.</span>
      </h1>
      <p className="mb-8 text-sm text-slate">
        {member.role === "ADMIN" ? "Admin" : "Team member"} &middot; {openTaskCount} open task
        {openTaskCount === 1 ? "" : "s"}
      </p>

      <div className="card mb-6 p-6">
        <h2 className="mb-1 text-lg text-ink">Details</h2>
        <p className="mb-4 text-sm text-slate">Name, email, and role.</p>
        <form action={updateWithId} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Name</label>
            <input
              name="name"
              defaultValue={member.name}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={member.email}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Role</label>
            <select
              name="role"
              defaultValue={member.role}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            >
              <option value="TEAM">Team member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="card mb-6 p-6">
        <h2 className="mb-1 text-lg text-ink">Password</h2>
        <p className="mb-4 text-sm text-slate">
          There&apos;s no email sending set up yet, so generate a temporary password and share it with them
          directly. They can change it themselves afterwards from their own Account page.
        </p>
        <ResetPasswordButton userId={member.id} />
      </div>

      <div className="card border-red-200 p-6">
        <h2 className="mb-1 text-lg text-ink">Remove from team</h2>
        <p className="mb-4 text-sm text-slate">
          Reassign or complete their open tasks first. This can&apos;t be undone.
        </p>
        <form action={removeTeamMember.bind(null, member.id)}>
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Remove team member
          </button>
        </form>
      </div>
    </div>
  );
}
