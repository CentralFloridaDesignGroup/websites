import { useMsal } from "@azure/msal-react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-6 px-6 py-10">
      <header className="rounded-xl border border-slate-300 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Northstar</h1>
            <p className="mt-2 text-slate-700">
              PM and CRM breakout site initialization is complete. Begin feature migration route-by-route.
            </p>
          </div>
          <AccountMenu />
        </div>
      </header>
      <section className="grid gap-3 rounded-xl border border-slate-300 bg-white p-6 md:grid-cols-2">
        <NavCard href="/invoices" label="Invoices" />
        <NavCard href="/clients" label="Clients" />
        <NavCard href="/projects" label="Projects" />
        <NavCard href="/proposal-generator" label="Proposal Generator" />
      </section>
    </main>
  );
}

function NavCard({ href, label }: { href: string; label: string }) {
  return (
    <Link to={href} className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 transition hover:bg-slate-100">
      {label}
    </Link>
  );
}

function AccountMenu() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  function handleLogout() {
    void instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  return (
    <div className="shrink-0 text-right">
      <p className="max-w-48 truncate text-sm text-slate-600">{account?.name ?? account?.username}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-2 text-sm font-medium text-slate-700 underline hover:text-slate-950"
      >
        Sign out
      </button>
    </div>
  );
}