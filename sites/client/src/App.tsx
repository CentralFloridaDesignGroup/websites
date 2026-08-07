import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pay/:token" element={<PayInvoicePage />} />
      <Route path="/invoices" element={<OpenInvoicesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LandingPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-4xl gap-6 px-6 py-10">
      <section className="rounded-xl border border-slate-300 bg-white p-6">
        <h1 className="text-3xl font-semibold text-slate-900">Client Billing Portal</h1>
        <p className="mt-2 text-slate-700">
          Tokenized payment flow scaffold is in place for breakout branch migration.
        </p>
      </section>
      <section className="rounded-xl border border-slate-300 bg-white p-6">
        <p className="text-slate-700">Use a payment link with a token to access invoice payment and related open invoices.</p>
      </section>
    </main>
  );
}

function PayInvoicePage() {
  const { token } = useParams();
  return (
    <main className="mx-auto grid min-h-screen max-w-4xl gap-5 px-6 py-10">
      <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        Back to Home
      </Link>
      <section className="rounded-xl border border-slate-300 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Invoice Payment</h2>
        <p className="mt-2 text-slate-700">Token loaded: {token || "(missing)"}</p>
        <p className="mt-2 text-slate-700">Phase 1 integration will reuse and migrate current tokenized pay flow here.</p>
      </section>
      <section>
        <Link to="/invoices" className="text-sm font-medium text-slate-700 underline decoration-slate-400 underline-offset-4 hover:text-slate-900">
          View Other Open Invoices
        </Link>
      </section>
    </main>
  );
}

function OpenInvoicesPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-4xl gap-5 px-6 py-10">
      <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        Back to Home
      </Link>
      <section className="rounded-xl border border-slate-300 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Open Invoices</h2>
        <p className="mt-2 text-slate-700">Phase 1 token-scoped open invoice list is reserved here.</p>
        <p className="mt-2 text-slate-700">Bulk payment remains out of scope for this branch.</p>
      </section>
    </main>
  );
}
