import { useMsal } from "@azure/msal-react";
import {
  ChevronDown,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Menu as MenuIcon,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { AccountInfo } from "@azure/msal-browser";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getMsalSilentRedirectUri, loginRequest } from "../auth/msalConfig";
import { useCompanySettings } from "../contexts/CompanySettingsContext";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  implemented?: boolean;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    label: "Operations",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Clients", href: "/clients", icon: Users },
      { label: "Vendors", href: "/vendors", icon: Users, implemented: false },
    ],
  },
  {
    label: "Financials",
    items: [
      { label: "Timesheets", href: "/timesheets", icon: FileText, implemented: false },
      { label: "Expense Reports", href: "/expense-reports", icon: FileText, implemented: false },
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Purchase Orders", href: "/purchase-orders", icon: Receipt, implemented: false },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Dynamic Reporting", href: "/quick-reports", icon: FileText, implemented: false },
      { label: "Report Warehouse", href: "/report-warehouse", icon: FileText, implemented: false },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Company Settings", href: "/company-settings", icon: Settings },
    ],
  },
];

function navigationClassName({ isActive }: { isActive: boolean }): string {
  const baseClasses = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-500";

  if (isActive) {
    return `${baseClasses} bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950`;
  }

  return `${baseClasses} text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-50`;
}

const DEFAULT_USER_ROLE = "Internal User";

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function getClaimRole(claims: Record<string, unknown> | undefined): string {
  const roles = claims?.roles;
  const role = claims?.role;
  const jobTitle = claims?.jobTitle;

  if (Array.isArray(roles) && typeof roles[0] === "string") {
    return roles[0];
  }

  if (typeof role === "string" && role.trim() !== "") {
    return role;
  }

  if (typeof jobTitle === "string" && jobTitle.trim() !== "") {
    return jobTitle;
  }

  return DEFAULT_USER_ROLE;
}

async function fetchSignedInUserRole(instance: ReturnType<typeof useMsal>["instance"], account: AccountInfo): Promise<string> {
  const token = await instance.acquireTokenSilent({
    ...loginRequest,
    account,
    redirectUri: getMsalSilentRedirectUri(),
  });

  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=jobTitle", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  if (!response.ok) {
    return "";
  }

  const profile = await response.json() as { jobTitle?: unknown };
  return normalizeString(profile.jobTitle);
}

export function NorthstarLayout() {
  const [mobileSidebarMounted, setMobileSidebarMounted] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const displayName = account?.name ?? account?.username ?? "White Point User";
  const claimRole = getClaimRole(account?.idTokenClaims as Record<string, unknown> | undefined);
  const [userRole, setUserRole] = useState(claimRole);
  const { settings } = useCompanySettings();

  useEffect(() => {
    let cancelled = false;

    if (!account) {
      setUserRole(DEFAULT_USER_ROLE);
      return;
    }

    setUserRole(claimRole);

    fetchSignedInUserRole(instance, account)
      .then((role) => {
        if (!cancelled && role) {
          setUserRole(role);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [account, claimRole, instance]);

  function openMobileSidebar() {
    setMobileSidebarMounted(true);
    window.requestAnimationFrame(() => setMobileSidebarVisible(true));
  }

  function closeMobileSidebar() {
    setMobileSidebarVisible(false);
    window.setTimeout(() => setMobileSidebarMounted(false), 200);
  }

  function handleLogout() {
    void instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950 dark:bg-neutral-900 dark:text-neutral-50 md:flex md:h-screen md:flex-col md:overflow-hidden">
      <header className="border-b border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 md:sticky md:top-0 md:z-30">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={openMobileSidebar}
              className="inline-flex size-10 items-center justify-center rounded-md text-neutral-700 transition hover:bg-neutral-200 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 md:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon className="size-5" aria-hidden="true" />
            </button>
            <NavLink to="/" className="flex min-w-0 items-center gap-3">
              <img src="/northstar-icon.webp" alt="" className="size-9 shrink-0 dark:hidden" />
              <img src="/northstar-icon-dark.webp" alt="" className="hidden size-9 shrink-0 dark:block" />
              <div className="min-w-0 hidden md:block">
                <p className="truncate text-base font-semibold">Northstar</p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-300 uppercase">{settings?.general.shortName ?? settings?.general.shortName ?? "Company Name Not Set"}</p>
              </div>
            </NavLink>
          </div>
          <AccountMenu displayName={displayName} userRole={userRole} onLogout={handleLogout} />
        </div>
      </header>

      <div className="md:grid md:min-h-0 md:flex-1 md:grid-cols-[20rem_minmax(0,1fr)] md:overflow-hidden">
        <aside className="hidden border-r border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 md:flex md:min-h-0 md:flex-col">
          <Navigation onNavigate={() => undefined} />
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 md:min-h-0 md:overflow-y-auto">
          <div className="mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileSidebarMounted && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className={`absolute inset-0 bg-neutral-950/55 transition-opacity duration-200 ${mobileSidebarVisible ? "opacity-100" : "opacity-0"}`}
            aria-label="Close navigation"
            onClick={closeMobileSidebar}
          />
          <aside
            className={`relative flex h-full w-80 max-w-[calc(100vw-2rem)] flex-col border-r border-neutral-300 bg-neutral-50 shadow-xl transition-transform duration-200 ease-out dark:border-neutral-700 dark:bg-neutral-800 ${mobileSidebarVisible ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="flex min-h-16 items-center justify-between border-b border-neutral-300 px-4 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <img src="/northstar-icon.webp" alt="" className="size-9 dark:hidden" />
                <img src="/northstar-icon-dark.webp" alt="" className="hidden size-9 dark:block" />
              </div>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="inline-flex size-10 items-center justify-center rounded-md text-neutral-700 transition hover:bg-neutral-200 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
                aria-label="Close navigation"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <Navigation onNavigate={closeMobileSidebar} />
          </aside>
        </div>
      )}
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4" aria-label="Main navigation">
      <NavLink to="/" end onClick={onNavigate} className={navigationClassName}>
        <span className="flex min-w-0 items-center gap-3">
          <Home className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate">Home</span>
        </span>
      </NavLink>
      {NAVIGATION_SECTIONS.map((section) => (
        <section key={section.label} className="grid gap-1">
          <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {section.label}
          </h2>
          {section.items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.href} to={item.href} onClick={onNavigate} className={navigationClassName}>
                <span className="flex min-w-0 items-center gap-3">
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.implemented === false && (
                  <span className="justify-self-end rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase leading-4 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                    Coming Soon
                  </span>
                )}
              </NavLink>
            );
          })}
        </section>
      ))}
    </nav>
  );
}

function AccountMenu({
  displayName,
  userRole,
  onLogout,
}: {
  displayName: string;
  userRole: string;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        className="flex max-w-56 items-center gap-3 rounded-md px-2 py-1.5 text-right transition hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:hover:bg-neutral-700"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-neutral-950 dark:text-neutral-50">{displayName}</span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-300">{userRole}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-neutral-500 dark:text-neutral-300" aria-hidden="true" />
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-neutral-300 bg-neutral-50 p-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800"
          role="menu"
        >
          <NavLink
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-200 hover:text-neutral-950 focus:bg-neutral-200 focus:text-neutral-950 focus:outline-none dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 dark:focus:bg-neutral-700 dark:focus:text-neutral-50"
            role="menuitem"
          >
            <Settings className="size-4" aria-hidden="true" />
            User Settings
          </NavLink>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-200 hover:text-neutral-950 focus:bg-neutral-200 focus:text-neutral-950 focus:outline-none dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-neutral-50 dark:focus:bg-neutral-700 dark:focus:text-neutral-50"
            role="menuitem"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
