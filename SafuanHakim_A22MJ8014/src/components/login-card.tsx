"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function LoginCard() {
  const [email, setEmail] = useState("agent@dhl.local");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Use any Supabase email/password account configured for this project.");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <form onSubmit={signIn} className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-panel">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-dhlRed">DHL Support Ops</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Sign in to incident reporting</h1>
        </div>
        <label className="block text-sm font-semibold text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2"
          required
        />
        <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2"
          required
        />
        <button className="mt-6 w-full rounded-md bg-dhlRed px-4 py-2.5 font-semibold text-white hover:bg-red-700">Sign in</button>
        <p className="mt-4 text-sm text-stone-600">{message}</p>
      </form>
    </main>
  );
}
