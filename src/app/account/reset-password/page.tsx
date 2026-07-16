"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const params = useSearchParams();
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");
  const submit = async () => {
    const response = await fetch("/api/auth/password-reset", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token"), password }) });
    const data = await response.json() as { error?: string };
    setMessage(response.ok ? "Your password was reset. You can now sign in." : (data.error ?? "Could not reset your password."));
  };
  return <div className="mx-auto max-w-md px-4 py-16"><Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound /> Reset password</CardTitle><CardDescription>Choose a new password with at least 10 characters, including a letter and number.</CardDescription></CardHeader><CardContent className="grid gap-3"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" /><Button onClick={() => void submit()}>Reset password</Button>{message && <p className="text-sm text-muted-foreground">{message}</p>}</CardContent></Card></div>;
}

export default function ResetPasswordPage() {
  return <React.Suspense fallback={<div className="mx-auto h-56 max-w-md animate-pulse px-4 py-16" />}><ResetPasswordForm /></React.Suspense>;
}
