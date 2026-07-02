import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteResource } from "@/lib/actions/resources";
import { EditResourceButton } from "@/components/edit-resource-button";
import { AddResourceForm } from "@/components/add-resource-form";

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
                <div className="flex items-center gap-3">
                  <EditResourceButton resource={resource} />
                  <form action={deleteResource.bind(null, resource.id)}>
                    <button type="submit" className="text-xs text-slate hover:text-red-600">
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
        {resources.length === 0 && <p className="text-sm text-slate">No resources yet.</p>}
      </div>

      {isAdmin && <AddResourceForm />}
    </div>
  );
}
