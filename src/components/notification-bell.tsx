"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getNotifications, markNotificationsRead } from "@/lib/actions/notifications";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Date;
};

function relativeTime(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const result = await getNotifications();
    setNotifications(result.notifications as NotificationItem[]);
    setUnreadCount(result.unreadCount);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getNotifications();
      if (cancelled) return;
      setNotifications(result.notifications as NotificationItem[]);
      setUnreadCount(result.unreadCount);
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const textClass = variant === "dark" ? "text-paper/90" : "text-ink";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-lg px-2 py-2 text-sm ${textClass} transition hover:bg-white/10`}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green px-1 text-[0.6rem] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-line bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await markNotificationsRead();
                  await refresh();
                })
              }
              className="text-xs font-semibold text-green-dark underline disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate">No notifications yet.</p>
            )}
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link}
                onClick={() => setOpen(false)}
                className={`block border-b border-line px-4 py-3 text-sm last:border-none hover:bg-paper ${
                  notification.read ? "" : "bg-green/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="font-display text-ink">{notification.title}</b>
                  {!notification.read && <span className="h-2 w-2 flex-none rounded-full bg-green" />}
                </div>
                <p className="mt-1 text-xs text-slate">{notification.body}</p>
                <p className="mt-1 text-[0.65rem] text-mist">{relativeTime(notification.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
