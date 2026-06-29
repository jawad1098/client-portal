import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile, updatePassword } from "@/lib/actions/account";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TEAM: "Team member",
  CLIENT: "Client",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { client: true },
  });

  if (!user) {
    redirect("/login");
  }

  const backHref = user.role === "CLIENT" ? "/portal" : "/admin";

  return (
    <div className="mx-auto max-w-2xl">
      <a href={backHref} className="text-sm text-green-dark hover:underline">
        &larr; Back
      </a>
      <h1 className="mt-3 text-2xl text-ink">
        Account<span className="brand-dot">.</span>
      </h1>
      <p className="mb-8 text-sm text-slate">
        {ROLE_LABEL[user.role]}
        {user.client ? ` · ${user.client.name}` : ""}
      </p>

      <div className="card mb-6 p-6">
        <h2 className="mb-1 text-lg text-ink">Profile details</h2>
        <p className="mb-4 text-sm text-slate">Your name and email address.</p>
        <form action={updateProfile} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Name</label>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 text-lg text-ink">Password</h2>
        <p className="mb-4 text-sm text-slate">Use at least 8 characters.</p>
        <form action={updatePassword} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Confirm new password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
