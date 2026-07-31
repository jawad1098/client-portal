import type { Task, User } from "@/generated/prisma/client";

const SLACK_API = "https://slack.com/api/chat.postMessage";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}${path}`;
}

function mention(user: Pick<User, "name" | "slackUserId">) {
  return user.slackUserId ? `<@${user.slackUserId}>` : user.name;
}

type SlackBlock = Record<string, unknown>;

async function postToSlackChannel(text: string, blocks?: SlackBlock[]) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    console.warn("[slack] SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set — skipping Slack message:", text);
    return null;
  }

  try {
    const res = await fetch(SLACK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel, text, blocks }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[slack] chat.postMessage failed:", data.error);
    }
    return data;
  } catch (err) {
    console.error("[slack] failed to post message:", err);
    return null;
  }
}

function formatDueDate(dueDate: Date | null) {
  if (!dueDate) return "no due date";
  return dueDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  });
}

/** Posted to the team channel whenever a task is created or reassigned. */
export async function postTaskAssigned(task: Task, assignee: Pick<User, "name" | "slackUserId">) {
  const link = appUrl(`/admin/tasks/${task.id}`);
  const text = `New task assigned to ${mention(assignee)}: "${task.title}" (due ${formatDueDate(task.dueDate)}) — ${link}`;
  await postToSlackChannel(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:clipboard: *New task assigned to ${mention(assignee)}*\n<${link}|${task.title}>\nDue: ${formatDueDate(task.dueDate)}`,
      },
    },
  ]);
}

/** Posted the morning a task is due. */
export async function postMorningReminder(task: Task, assignee: Pick<User, "name" | "slackUserId">) {
  const link = appUrl(`/admin/tasks/${task.id}`);
  const text = `Task due today for ${mention(assignee)}: "${task.title}" — ${link}`;
  await postToSlackChannel(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:alarm_clock: *Due today:* <${link}|${task.title}>\nAssigned to ${mention(assignee)}`,
      },
    },
  ]);
}

/** Posted in the evening on the due date, with interactive Done / Not yet buttons. */
export async function postEveningCheckin(task: Task, assignee: Pick<User, "name" | "slackUserId">) {
  const link = appUrl(`/admin/tasks/${task.id}`);
  const text = `Did you finish "${task.title}", ${mention(assignee)}?`;
  await postToSlackChannel(text, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:bell: *Did you finish this today?*\n<${link}|${task.title}>\nAssigned to ${mention(assignee)}`,
      },
    },
    {
      type: "actions",
      block_id: "task_checkin",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Done" },
          style: "primary",
          action_id: "task_done",
          value: task.id,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Not yet" },
          style: "danger",
          action_id: "task_not_done",
          value: task.id,
        },
      ],
    },
  ]);
}
