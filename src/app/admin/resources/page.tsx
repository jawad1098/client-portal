import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addTeamResource, deleteResource } from "@/lib/actions/resources";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminResourcesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const resources = await prisma.resource.findMany({
    where: { audience: "TEAM" },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl text-ink">
        Resources<span className="brand-dot">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate">SOPs, brand guides, and shared docs for the team.</p>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {resources.map((resource) => (
          <div key={resource.id} className="link-card">
            <b className="font-display block">{resource.title}</b>
            {resource.filename ? (
              <span className="text-sm text-slate">
                {resource.filename} &middot; {formatSize(resource.size ?? 0)}
              </span>
            ) : (
              resource.description && <span className="text-sm text-slate">{resource.description}</span>
            )}
            <div className="mt-2 flex items-center justify-between">
              <a href={resource.url} target="_blank" rel="noreferrer" className="go text-sm">
                {resource.filename ? "Download" : "Open"} &rarr;
              </a>
              {isAdmin && (
                <form action={deleteResource.bind(null, resource.id)}>
                  <button type="submit" className="text-xs text-slate hover:text-red-600">
                    Remove
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {resources.length === 0 && <p className="text-sm text-slate">No resources yet.</p>}
      </div>

      {isAdmin && (
        <form action={addTeamResource} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Title</label>
            <input name="title" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">URL (or upload a file below)</label>
            <input name="url" type="url" className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Or upload a file (max 10MB)</label>
            <input name="file" type="file" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Description</label>
            <input name="description" className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add resource
          </button>
        </form>
      )}
    </div>
  );
}
