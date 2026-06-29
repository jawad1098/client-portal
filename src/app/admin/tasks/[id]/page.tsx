import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  addTaskComment,
  addTaskAttachment,
  deleteTaskAttachment,
  deleteTask,
} from "@/lib/actions/tasks";
import { TaskStatusSelect } from "../task-status-select";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: true,
      client: true,
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      attachments: { include: { addedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) {
    notFound();
  }

  const instructions = task.attachments.filter((a) => a.kind === "INSTRUCTION");
  const proofs = task.attachments.filter((a) => a.kind === "PROOF");

  const addCommentWithId = addTaskComment.bind(null, task.id);
  const addInstructionWithId = addTaskAttachment.bind(null, task.id, "INSTRUCTION");
  const addProofWithId = addTaskAttachment.bind(null, task.id, "PROOF");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/tasks" className="text-sm text-slate hover:text-green-dark">
          &larr; All tasks
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl text-ink">
            {task.title}
            <span className="brand-dot">.</span>
          </h1>
          {isAdmin && (
            <form action={deleteTask.bind(null, task.id)}>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-slate hover:border-red-400 hover:text-red-600"
              >
                Delete task
              </button>
            </form>
          )}
        </div>
        {task.description && <p className="mt-2 text-sm text-slate">{task.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate">
          {task.client && <span className="rounded-full bg-paper px-2 py-1">{task.client.name}</span>}
          {task.assignee && <span className="rounded-full bg-paper px-2 py-1">{task.assignee.name}</span>}
          {task.dueDate && (
            <span className="rounded-full bg-paper px-2 py-1">
              Due {new Date(task.dueDate).toLocaleDateString("en-GB")}
            </span>
          )}
          <span className="rounded-full bg-paper px-2 py-1">Created by {task.createdBy.name}</span>
        </div>
        <div className="mt-4">
          <TaskStatusSelect taskId={task.id} status={task.status} />
        </div>
      </div>

      {/* Instructions & assets */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Instructions &amp; assets</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {instructions.map((attachment) => (
            <div key={attachment.id} className="link-card">
              <b className="font-display block">{attachment.label}</b>
              <span className="text-sm text-slate">Added by {attachment.addedBy.name}</span>
              <div className="mt-2 flex items-center justify-between">
                <a href={attachment.url} target="_blank" rel="noreferrer" className="go text-sm">
                  Open &rarr;
                </a>
                {isAdmin && (
                  <form action={deleteTaskAttachment.bind(null, attachment.id)}>
                    <button type="submit" className="text-xs text-slate hover:text-red-600">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {instructions.length === 0 && <p className="text-sm text-slate">No instructions or assets yet.</p>}
        </div>
        <form action={addInstructionWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Label</label>
            <input name="label" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">URL</label>
            <input name="url" type="url" className="w-64 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">or upload file (max 10MB)</label>
            <input name="file" type="file" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add instruction
          </button>
        </form>
      </section>

      {/* Completion proof */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Completion proof</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {proofs.map((attachment) => (
            <div key={attachment.id} className="link-card">
              <b className="font-display block">{attachment.label}</b>
              <span className="text-sm text-slate">Added by {attachment.addedBy.name}</span>
              <div className="mt-2 flex items-center justify-between">
                <a href={attachment.url} target="_blank" rel="noreferrer" className="go text-sm">
                  Open &rarr;
                </a>
                {isAdmin && (
                  <form action={deleteTaskAttachment.bind(null, attachment.id)}>
                    <button type="submit" className="text-xs text-slate hover:text-red-600">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {proofs.length === 0 && <p className="text-sm text-slate">No completion proof yet.</p>}
        </div>
        <form action={addProofWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">Label</label>
            <input name="label" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">URL</label>
            <input name="url" type="url" className="w-64 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink">or upload file (max 10MB)</label>
            <input name="file" type="file" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Add proof
          </button>
        </form>
      </section>

      {/* Comments */}
      <section>
        <h2 className="mb-3 text-lg text-ink">Comments</h2>
        <div className="card mb-4 flex flex-col gap-3 p-4">
          {task.comments.map((comment) => (
            <div key={comment.id} className="border-b border-line pb-3 last:border-none last:pb-0">
              <p className="text-sm text-ink">{comment.body}</p>
              <p className="mt-1 text-xs text-slate">
                {comment.author.name} &middot; {new Date(comment.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-slate">No comments yet.</p>}
        </div>
        <form action={addCommentWithId} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink">Add a comment</label>
            <input name="body" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
          </div>
          <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
            Post
          </button>
        </form>
      </section>
    </div>
  );
}
