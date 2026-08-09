import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="grid gap-6">
      <header className="rounded-lg border border-neutral-300 bg-neutral-50 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="text-3xl font-semibold text-neutral-950 dark:text-neutral-50">Northstar</h1>
        <p className="mt-2 max-w-3xl text-neutral-700 dark:text-neutral-300">
          PM and CRM breakout site initialization is complete. Begin feature migration route-by-route.
        </p>
      </header>
      <section className="grid gap-3 rounded-lg border border-neutral-300 bg-neutral-50 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 md:grid-cols-2">
        <NavCard href="/invoices" label="Invoices" />
        <NavCard href="/clients" label="Clients" />
        <NavCard href="/projects" label="Projects" />
        <NavCard href="/proposal-generator" label="Proposal Generator" />
      </section>
    </div>
  );
}

function NavCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="rounded-md border border-neutral-300 bg-neutral-100 px-4 py-3 font-medium text-neutral-900 transition hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-600"
    >
      {label}
    </Link>
  );
}
