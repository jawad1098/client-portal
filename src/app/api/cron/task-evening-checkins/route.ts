import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postEveningCheckin } from "@/lib/slack";
import { todayRangePKT } from "@/lib/pkt-date";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = todayRangePKT();

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      assigneeId: { not: null },
      dueDate: { gte: start, lt: end },
      eveningReminderSentAt: null,
    },
    include: { assignee: true },
  });

  for (const task of tasks) {
    if (!task.assignee) continue;
    await postEveningCheckin(task, task.assignee);
    await prisma.task.update({
      where: { id: task.id },
      data: { eveningReminderSentAt: new Date() },
    });
  }

  return NextResponse.json({ sent: tasks.length });
}
