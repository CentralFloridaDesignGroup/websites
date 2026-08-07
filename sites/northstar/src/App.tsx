import { Link, Navigate, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
      <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
      <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
      <Route path="/proposal-generator" element={<PlaceholderPage title="Proposal Generator" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-6 px-6 py-10">
      <header className="rounded-xl border border-slate-300 bg-white p-6">
        <h1 className="text-3xl font-semibold text-slate-900">Northstar</h1>
        <p className="mt-2 text-slate-700">
          PM and CRM breakout site initialization is complete. Begin feature migration route-by-route.
        </p>
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

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-5 px-6 py-10">
      <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        Back to Northstar Home
      </Link>
      <section className="rounded-xl border border-slate-300 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-700">This route is ready for migration from document PM workflows.</p>
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
