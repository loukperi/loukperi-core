"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    tokens?: {
      accessToken?: string;
      access_token?: string;
      token?: string;
    };
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.loukperi.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await apiPost<LoginResponse>("/auth/login", {
        email,
        password,
      });

	  console.log("LOGIN RESPONSE:", result);
	  
	  const token =
	    result.accessToken ||
	    result.access_token ||
	    result.token ||
	    result.data?.accessToken ||
	    result.data?.access_token ||
	    result.data?.token ||
	    result.data?.tokens?.accessToken ||
	    result.data?.tokens?.access_token ||
	    result.data?.tokens?.token;

      if (!token) {
        setMessage("Το login πέτυχε, αλλά δεν βρέθηκε token στο response.");
        return;
      }

	  localStorage.setItem("loukperi_access_token", token);
	  setMessage("Login επιτυχές ✅");
	  router.push("/dashboard");
	  
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1F3A] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          <section className="hidden bg-gradient-to-br from-[#102B4F] to-[#071629] p-10 lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-10 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  LoukPeri Core
                </div>

                <h1 className="text-4xl font-semibold tracking-tight">
                  Business dashboards, records και tasks σε ένα καθαρό shell.
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
                  Το πρώτο frontend layer για το LoukPeri Core. Από εδώ θα
                  συνδεθούμε με Auth, RBAC, dashboard data, reports και exports.
                </p>
              </div>

              <p className="text-sm tracking-[0.18em] text-slate-400">
                ΓΡΗΓΟΡΑ. ΣΩΣΤΑ.
              </p>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6EC1FF]">
                  Login
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  Σύνδεση στο LoukPeri Core
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Κάνουμε πρώτα validate ότι το frontend μπορεί να μιλήσει με το
                  backend auth endpoint.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#3A8DFF]"
                    placeholder="admin@demo.loukperi.local"
                    type="email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#3A8DFF]"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#3A8DFF] px-5 py-3 font-semibold text-white shadow-[0_16px_40px_rgba(58,141,255,0.28)] transition hover:bg-[#5a9eff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Σύνδεση..." : "Σύνδεση"}
                </button>

                {message ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {message}
                  </div>
                ) : null}
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}