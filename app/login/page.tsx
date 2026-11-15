"use client";
import { useActionState } from "react";
import { signIn } from "../actions";

export default function Login() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form action={action} className="w-full max-w-sm space-y-5">
        <div>
          <h1>Creator Pipeline</h1>
          <p className="text-muted mt-1">Sign in to see today's outreach.</p>
        </div>
        <label className="block space-y-1.5">
          <span className="font-semibold text-sm">Email</span>
          <input name="email" type="email" autoComplete="email" required className="field" />
        </label>
        <label className="block space-y-1.5">
          <span className="font-semibold text-sm">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="field" />
        </label>
        {error && <p role="alert" className="text-red text-sm">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
