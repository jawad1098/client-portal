"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { globalSearch, clientSearch, type SearchResult } from "@/lib/actions/search";
import { startImpersonation } from "@/lib/actions/impersonate";

type SwitchTarget = {
  userId: string;
  label: string;
  sublabel: string;
  role: "TEAM" | "CLIENT";
};

type CommandPaletteProps = {
  role: "ADMIN" | "TEAM" | "CLIENT";
  /** Only relevant for ADMIN, when not currently impersonating. */
  switchTargets?: { clients: SwitchTarget[]; team: SwitchTarget[] };
  /** "sidebar" = full-width block button (admin sidebar). "icon" = compact inline button (portal header). */
  triggerVariant?: "sidebar" | "icon";
};

/**
 * Self-contained command palette: owns its own open/close state, listens for
 * Cmd+K / Ctrl+K globally, and renders a trigger button (for the sidebar /
 * header) plus the modal overlay itself.
 */
export function CommandPalette({ role, switchTargets, triggerVariant = "sidebar" }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        // Cmd/Ctrl+K should open the palette even while focused in another
        // input/textarea — only suppress the browser's own shortcut.
        event.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (event.key === "Escape" && open) {
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      const timeout = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(timeout);
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      const search = role === "CLIENT" ? clientSearch : globalSearch;
      search(q).then((res) => {
        if (!cancelled) setResults(res);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, open, role]);

  function goTo(href: string) {
    close();
    router.push(href);
  }

  function switchTo(userId: string, targetRole: "TEAM" | "CLIENT") {
    setError(null);
    startTransition(async () => {
      try {
        const { token } = await startImpersonation(userId);
        const result = await signIn("impersonate", { token, redirect: false });
        if (result?.error) {
          throw new Error("Couldn't switch view");
        }
        window.location.href = targetRole === "CLIENT" ? "/portal" : "/admin";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const q = query.trim().toLowerCase();
  const canSwitch = role === "ADMIN" && !!switchTargets;
  const filteredClients = canSwitch
    ? switchTargets!.clients.filter(
        (c) => !q || c.label.toLowerCase().includes(q) || c.sublabel.toLowerCase().includes(q)
      )
    : [];
  const filteredTeam = canSwitch
    ? switchTargets!.team.filter((t) => !q || t.label.toLowerCase().includes(q))
    : [];

  const groups: { label: string; items: SearchResult[] }[] = [
    { label: "Clients", items: results.filter((r) => r.type === "Client") },
    { label: "Tasks", items: results.filter((r) => r.type === "Task") },
    { label: "Tickets", items: results.filter((r) => r.type === "Ticket") },
    { label: "Team", items: results.filter((r) => r.type === "Team") },
    { label: "Resources", items: results.filter((r) => r.type === "Resource") },
  ].filter((g) => g.items.length > 0);

  const hasSwitchResults = q.length > 0 && (filteredClients.length > 0 || filteredTeam.length > 0);
  const hasAnyResults = groups.length > 0 || hasSwitchResults;

  return (
    <>
      {triggerVariant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-medium text-paper/90 transition hover:bg-white/10"
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden>⌘</span> Search
          </span>
          <span className="text-mist">Ctrl K</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="rounded-lg px-2 py-2 text-sm text-paper/90 transition hover:bg-white/10"
        >
          🔎
        </button>
      )}

      {open && (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/60 px-4 pt-24" onClick={close}>
      <div
        className="card w-full max-w-[520px] p-0 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={role === "CLIENT" ? "Search resources, tickets..." : "Search clients, tasks, tickets, team..."}
          className="w-full border-b border-line px-4 py-3 text-sm text-ink outline-none"
        />

        {error && <p className="px-4 pt-3 text-xs text-red-600">{error}</p>}

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-slate">Start typing to search.</p>
          )}

          {q.length > 0 && !hasAnyResults && (
            <p className="px-2 py-4 text-center text-sm text-slate">No matches.</p>
          )}

          {groups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate">
                {group.label}
              </p>
              <div className="flex flex-col">
                {group.items.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => goTo(item.href)}
                    className="rounded-lg px-2 py-2 text-left text-sm text-ink transition hover:bg-paper"
                  >
                    <span className="block font-medium">{item.label}</span>
                    {item.sublabel && <span className="block text-xs text-slate">{item.sublabel}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {hasSwitchResults && (
            <div className="mb-2">
              <p className="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate">
                Switch to...
              </p>
              <div className="flex flex-col">
                {filteredClients.map((c) => (
                  <button
                    key={c.userId}
                    type="button"
                    disabled={isPending}
                    onClick={() => switchTo(c.userId, "CLIENT")}
                    className="rounded-lg px-2 py-2 text-left text-sm text-ink transition hover:bg-paper disabled:opacity-60"
                  >
                    <span className="block font-medium">⇆ {c.label}</span>
                    <span className="block text-xs text-slate">{c.sublabel}</span>
                  </button>
                ))}
                {filteredTeam.map((t) => (
                  <button
                    key={t.userId}
                    type="button"
                    disabled={isPending}
                    onClick={() => switchTo(t.userId, "TEAM")}
                    className="rounded-lg px-2 py-2 text-left text-sm text-ink transition hover:bg-paper disabled:opacity-60"
                  >
                    <span className="block font-medium">⇆ {t.label}</span>
                    <span className="block text-xs text-slate">{t.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2 text-[0.65rem] text-mist">
          <kbd className="rounded border border-line px-1">Esc</kbd> to close
        </div>
      </div>
    </div>
      )}
    </>
  );
}
