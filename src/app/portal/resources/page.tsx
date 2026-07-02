import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalResourcesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const resources = await prisma.resource.findMany({
    where: { clientId: session.user.clientId, audience: "CLIENT" },
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl text-ink">
          Resources<span className="brand-dot">.</span>
        </h2>
        <p className="mt-1 text-sm text-slate">Brand assets, guides, and files shared with you.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="card flex flex-col gap-3 p-5 transition hover:border-green"
          >
            <div className="flex-1">
              <p className="font-display text-base font-semibold text-ink">{resource.title}</p>
              {resource.description && (
                <p className="mt-1 text-sm text-slate">{resource.description}</p>
              )}
              {resource.filename && (
                <p className="mt-1 text-xs text-mist">
                  {resource.filename} &middot; {formatSize(resource.size ?? 0)}
                </p>
              )}
            </div>
            <div className="border-t border-line pt-3">
              <span className="text-sm font-medium text-green-dark">
                {resource.filename ? "Download" : "Open"} →
              </span>
            </div>
          </a>
        ))}
        {resources.length === 0 && (
          <p className="col-span-3 text-sm text-slate">No resources have been shared with you yet.</p>
        )}
      </div>
    </div>
  );
}
