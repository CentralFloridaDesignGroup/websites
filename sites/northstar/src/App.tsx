import { Link, Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./auth/RouteGuard";
import { LoginPage } from "./auth/login";
import { HomePage } from "./pages/home";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RouteGuard />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
        <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
        <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
        <Route path="/proposal-generator" element={<PlaceholderPage title="Proposal Generator" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
