"use client";

import * as React from "react";
import { Download, KeyRound, LogIn, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/catalog/page-header";

type Account = { email: string; createdAt?: string } | null;

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
}

function guestSnapshot() {
  const learning = readJson<{ progress?: { byAlgorithm?: Record<string, { category?: string; attempts: number; correct: number; mistakes: number; lastSeen: number }> }; xp?: number; streak?: number; achievements?: string[]; events?: unknown[] }>("bdsv:learning", {});
  const progress = Object.entries(learning.progress?.byAlgorithm ?? {}).map(([algorithmSlug, value]) => ({ algorithmSlug, categoryId: value.category ?? "unknown", ...value }));
  const savedVisualizations = Object.keys(localStorage).filter((key) => key.startsWith("bdsv:save:")).flatMap((key) => {
    const payload = readJson<unknown>(key, null);
    return payload ? [{ slug: key.slice("bdsv:save:".length), label: "default", payload }] : [];
  });
  const savedComparisons = readJson<Array<{ key?: string; label?: string; payload: unknown }>>("bdsv:saved-comparisons", []).map((item, index) => ({ ...item, key: item.key ?? `local-${index}` }));
  return { settings: readJson<Record<string, unknown>>("bdsv:settings", {}), progress, learner: { xp: learning.xp, streak: learning.streak, achievements: learning.achievements, gamification: readJson<{ gamification?: boolean }>("bdsv:settings", {}).gamification }, events: learning.events ?? [], savedVisualizations, savedComparisons };
}

function mergeRemote(data: { profile?: { settings?: Record<string, unknown>; xp?: number; streak?: number }; progress?: Array<{ algorithm_slug: string; category_id: string; attempts: number; correct: number; mistakes: number; last_seen: number }>; achievements?: string[]; events?: unknown[]; savedVisualizations?: Array<{ slug: string; payload: unknown }>; savedComparisons?: unknown[] }) {
  const local = guestSnapshot();
  const localLearning = readJson<Record<string, unknown>>("bdsv:learning", {});
  const algorithms = (localLearning.progress as { byAlgorithm?: Record<string, unknown> } | undefined)?.byAlgorithm ?? {};
  for (const item of data.progress ?? []) {
    const own = algorithms[item.algorithm_slug] as { attempts?: number; correct?: number; mistakes?: number; lastSeen?: number } | undefined;
    algorithms[item.algorithm_slug] = { attempts: Math.max(own?.attempts ?? 0, item.attempts), correct: Math.max(own?.correct ?? 0, item.correct), mistakes: Math.max(own?.mistakes ?? 0, item.mistakes), lastSeen: Math.max(own?.lastSeen ?? 0, Number(item.last_seen ?? 0)) };
  }
  localStorage.setItem("bdsv:learning", JSON.stringify({ ...localLearning, progress: { ...(localLearning.progress as object ?? {}), byAlgorithm: algorithms }, xp: Math.max(Number(localLearning.xp ?? 0), data.profile?.xp ?? 0), streak: Math.max(Number(localLearning.streak ?? 0), data.profile?.streak ?? 0), achievements: [...new Set([...(local.learner.achievements ?? []), ...(data.achievements ?? [])])], events: [...new Map([...(local.events as Array<{ id: string }> ?? []), ...((data.events ?? []) as Array<{ id: string }>)].map((event) => [event.id, event])).values()].slice(-1000) }));
  localStorage.setItem("bdsv:settings", JSON.stringify({ ...(data.profile?.settings ?? {}), ...local.settings }));
  for (const saved of data.savedVisualizations ?? []) localStorage.setItem(`bdsv:save:${saved.slug}`, JSON.stringify(saved.payload));
  if (data.savedComparisons) localStorage.setItem("bdsv:saved-comparisons", JSON.stringify(data.savedComparisons));
}

export default function AccountPage() {
  const [account, setAccount] = React.useState<Account>(null);
  const [ready, setReady] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const refresh = React.useCallback(async () => {
    const response = await fetch("/api/account");
    const data = await response.json() as { user?: Account; accountsEnabled?: boolean };
    setAccount(data.user ?? null);
    setReady(true);
    if (data.accountsEnabled === false) setMessage("Accounts are not enabled on this deployment yet. You can continue studying locally.");
  }, []);
  React.useEffect(() => { void refresh(); }, [refresh]);

  const submit = async (endpoint: "register" | "login") => {
    setMessage("");
    const response = await fetch(`/api/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await response.json() as { error?: string; user?: { email: string } };
    if (!response.ok) { setMessage(data.error ?? "Could not continue."); return; }
    setAccount(data.user ?? null);
    setPassword("");
    await synchronize();
    setMessage(endpoint === "register" ? "Account created and local study data synchronized." : "Signed in and local study data synchronized.");
  };

  const synchronize = async () => {
    const sent = await fetch("/api/account/sync", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guestSnapshot()) });
    if (!sent.ok) { setMessage("Could not synchronize local data."); return; }
    const received = await fetch("/api/account/sync");
    if (!received.ok) { setMessage("Local data was uploaded, but the merged account copy could not be loaded."); return; }
    mergeRemote(await received.json());
  };

  const requestReset = async () => {
    const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json() as { message?: string };
    setMessage(data.message ?? "If an account exists, recovery instructions will be sent.");
  };

  const exportData = async () => {
    const response = await fetch("/api/account/export");
    if (!response.ok) { setMessage("Could not export your account data."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "bornat-visualizer-data.json"; link.click(); URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account and all synchronized data permanently? This cannot be undone.")) return;
    const response = await fetch("/api/account", { method: "DELETE" });
    if (response.ok) { setAccount(null); setMessage("Your account and synchronized data were deleted."); }
    else setMessage("Could not delete the account.");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <PageHeader icon={KeyRound} title="Optional account" description="Guests keep studying locally. Sign in only when you want encrypted-password access and cross-device sync." />
      {message && <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{message}</p>}
      {!ready ? <Card className="h-40 animate-pulse" /> : account ? (
        <Card>
          <CardHeader><CardTitle>{account.email}</CardTitle><CardDescription>Your local study tools remain available; an account only adds synchronization and recovery.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void synchronize()}><RefreshCw /> Sync local data</Button>
            <Button variant="secondary" onClick={exportData}><Download /> Export my data</Button>
            <Button variant="outline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); setAccount(null); setMessage("Signed out. Your browser data remains local."); }}><LogIn /> Sign out</Button>
            <Button variant="destructive" onClick={deleteAccount}><Trash2 /> Delete account</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Continue across devices</CardTitle><CardDescription>A password needs at least 10 characters and must include a letter and a number.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Password" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void submit("login")}><LogIn /> Sign in</Button>
              <Button variant="secondary" onClick={() => void submit("register")}><UserPlus /> Create account</Button>
              <Button variant="ghost" onClick={() => void requestReset()}>Forgot password?</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
