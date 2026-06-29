import { createClient } from "@/lib/actions/clients";

export default function NewClientPage() {
  return (
    <div>
      <h1 className="text-2xl text-ink">
        Add client<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">
        Create the client record, and optionally send them a portal invite right away.
      </p>

      <form action={createClient} className="card flex max-w-lg flex-col gap-4 p-6">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
            Client name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="Active"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
          >
            <option value="Onboarding">Onboarding</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
        </div>

        <div className="mt-2 border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="sendInvite" className="h-4 w-4" />
            Send a portal invite now
          </label>

          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label htmlFor="inviteName" className="mb-1 block text-sm font-medium text-ink">
                Contact name
              </label>
              <input
                id="inviteName"
                name="inviteName"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
              />
            </div>
            <div>
              <label htmlFor="inviteEmail" className="mb-1 block text-sm font-medium text-ink">
                Contact email
              </label>
              <input
                id="inviteEmail"
                name="inviteEmail"
                type="email"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-dark"
        >
          Create client
        </button>
      </form>
    </div>
  );
}
