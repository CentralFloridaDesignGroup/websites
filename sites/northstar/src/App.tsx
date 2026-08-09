import { Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./auth/RouteGuard";
import { LoginPage } from "./auth/login";
import { NorthstarLayout } from "./components/NorthstarLayout";
import { HomePage } from "./pages/home";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RouteGuard />}>
        <Route element={<NorthstarLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/invoices" element={<PlaceholderPage title="Invoices" />} />
          <Route path="/clients" element={<PlaceholderPage title="Clients" />} />
          <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
          <Route path="/vendors" element={<PlaceholderPage title="Vendors" />} />
          <Route path="/timesheets" element={<PlaceholderPage title="Timesheets" />} />
          <Route path="/expense-reports" element={<PlaceholderPage title="Expense Reports" />} />
          <Route path="/report-warehouse" element={<PlaceholderPage title="Report Warehouse" />} />
          <Route path="/quick-reports" element={<PlaceholderPage title="Quick Reports" />} />
          <Route path="/company-settings" element={<PlaceholderPage title="Company Settings" />} />
          <Route path="/proposal-generator" element={<PlaceholderPage title="Proposal Generator" />} />
          <Route path="/settings" element={<PlaceholderPage title="User Settings" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-neutral-300 bg-neutral-50 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-50">{title}</h1>
      <p className="mt-2 text-neutral-700 dark:text-neutral-300">This route is ready for migration from document PM workflows.</p>
    </section>
  );
}
