import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function verifySlackSignature(rawBody: string, timestamp: string, signature: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  // Reject requests older than 5 minutes to prevent replay attacks
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hmac}`;

  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const payload = JSON.parse(payloadRaw);
  const action = payload.actions?.[0];
  const responseUrl: string | undefined = payload.response_url;

  if (!action || !responseUrl) {
    return NextResponse.json({ ok: true });
  }

  const taskId = action.value as string;
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task) {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replace_original: false, text: "That task no longer exists." }),
    });
    return NextResponse.json({ ok: true });
  }

  if (action.action_id === "task_done") {
    await prisma.task.update({ where: { id: taskId }, data: { status: "DONE" } });
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: true,
        text: `:white_check_mark: *Marked done:* ${task.title}`,
      }),
    });
  } else if (action.action_id === "task_not_done") {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: true,
        text: `:hourglass: Got it — "${task.title}" is still in progress. Update it in the portal when you're done.`,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
