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
        <p className="mb-4 text-sm text-slate">Brand assets, guides, and files your team has shared with you.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {resources.map((resource) => (
          <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="link-card">
            <b className="font-display block">{resource.title}</b>
            {resource.filename ? (
              <span className="text-sm text-slate">
                {resource.filename} &middot; {formatSize(resource.size ?? 0)}
              </span>
            ) : (
              resource.description && <span className="text-sm text-slate">{resource.description}</span>
            )}
            <br />
            <span className="go text-sm">{resource.filename ? "Download" : "Open"} &rarr;</span>
          </a>
        ))}
        {resources.length === 0 && <p className="text-sm text-slate">No resources yet.</p>}
      </div>
    </div>
  );
}
