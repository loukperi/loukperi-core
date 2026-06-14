"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AuthWorkspace = {
  id?: string;
  name?: string;
};

type AuthMeResponse = {
  user?: AuthUser;
  workspace?: AuthWorkspace;
  data?: {
    user?: AuthUser;
    workspace?: AuthWorkspace;
  };
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Records", href: "/records", icon: "📁" },
  { label: "Tasks", href: "/tasks", icon: "✅" },
  { label: "Reports", href: "/reports", icon: "📊" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("loukperi_access_token");
}

function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("loukperi_access_token");
}

function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
  );
}

function normalizeAuthMe(payload: AuthMeResponse | null) {
  return {
    user: payload?.user ?? payload?.data?.user,
    workspace: payload?.workspace ?? payload?.data?.workspace,
  };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useAppSettings();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authWorkspace, setAuthWorkspace] = useState<AuthWorkspace | null>(
    null
  );

  const displayWorkspaceName =
    authWorkspace?.name ?? settings.workspaceName ?? "Demo Workspace";

  const displayUserName = authUser?.name ?? settings.userName ?? "Admin User";

  const displayUserEmail =
    authUser?.email ?? settings.userEmail ?? "admin@client.com";

  const activePageTitle = useMemo(() => {
    return (
      navItems.find((item) => pathname.startsWith(item.href))?.label ??
      "LoukPeri Core"
    );
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthMe() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          clearAccessToken();
          router.replace("/login");
          return;
        }

        const payload = (await response.json()) as AuthMeResponse;
        const normalized = normalizeAuthMe(payload);

        if (!cancelled) {
          setAuthUser(normalized.user ?? null);
          setAuthWorkspace(normalized.workspace ?? null);
          setAuthLoading(false);
        }
      } catch (error) {
        console.error("Failed to load auth/me", error);

        clearAccessToken();

        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    loadAuthMe();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function handleLogout() {
    clearAccessToken();
    router.replace("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/dashboard" className="group block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#0B1F3A] shadow-sm">
              LP
            </div>

            <div>
              <p className="text-sm font-semibold text-white">LoukPeri</p>
              <p className="text-xs text-slate-300">Core</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 py-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          <p className="mt-2 truncate text-sm font-semibold text-white">
            {displayWorkspaceName}
          </p>

          <p className="mt-1 truncate text-xs text-slate-300">
            {settings.companyName}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-[#0B1F3A] shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3A8DFF] text-sm font-bold text-white">
              {displayUserName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {displayUserName}
              </p>
              <p className="truncate text-xs text-slate-300">
                {displayUserEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#3A8DFF]" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading LoukPeri Core...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-[#0B1F3A] lg:block">
        {sidebarContent}
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="relative h-full w-80 max-w-[86vw] bg-[#0B1F3A] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl shadow-sm transition hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3A8DFF]">
                  LoukPeri Core
                </p>

                <h1 className="truncate text-xl font-semibold text-slate-950">
                  {activePageTitle}
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs font-medium text-slate-400">
                  Data Source
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {settings.dataSourceMode}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <p className="text-xs font-medium text-slate-400">User</p>
                <p className="max-w-44 truncate text-sm font-semibold text-slate-700">
                  {displayUserName}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}