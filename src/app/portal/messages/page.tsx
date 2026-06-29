import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/actions/messages";

export default async function PortalMessagesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const messages = await prisma.message.findMany({
    where: { clientId: session.user.clientId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  const sendMessageWithId = sendMessage.bind(null, session.user.clientId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl text-ink">
          Messages<span className="brand-dot">.</span>
        </h2>
        <p className="mb-4 text-sm text-slate">A direct line to your team.</p>
      </div>

      <div className="card flex flex-col gap-3 p-4">
        {messages.map((message) => {
          const isMine = message.senderId === session.user.id;
          return (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                isMine ? "self-end bg-green/10" : "self-start bg-paper"
              }`}
            >
              <p className="text-ink">{message.body}</p>
              <p className="mt-1 text-xs text-mist">
                {message.sender.name} &middot; {new Date(message.createdAt).toLocaleString("en-GB")}
              </p>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-sm text-slate">No messages yet. Say hello below.</p>}
      </div>

      <form action={sendMessageWithId} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink">Message</label>
          <input name="body" required className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green" />
        </div>
        <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-dark">
          Send
        </button>
      </form>
    </div>
  );
}
