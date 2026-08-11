import { MsalProvider } from "@azure/msal-react";
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS } from "cfdg/types/constants";
import { msalInstance } from "./auth/msalConfig";
import { LoginPage } from "./auth/login";
import { AuthProvider, ProtectedRoutes } from "./auth/AuthContext";
import { CompanySettingsProvider } from "./contexts/CompanySettingsContext";
import { ErrorLandingPage, RouteErrorLandingPage } from "./components/ErrorLandingPage";
import { NorthstarLayout } from "./components/NorthstarLayout";

const HomePage = lazy(() => import("./pages/home").then((module) => ({ default: module.HomePage })));
const CompanySettingsPage = lazy(() => import("./pages/companySettings/companySettings").then((module) => ({ default: module.CompanySettingsPage })));
const ClientsPage = lazy(() => import("./pages/clients/list").then((module) => ({ default: module.ClientsPage })));
const ProjectsPage = lazy(() => import("./pages/projects/list").then((module) => ({ default: module.ProjectsPage })));

function RouteLoading() { return <div className="flex min-h-[12rem] items-center justify-center text-sm text-neutral-600 dark:text-neutral-300">Loading...</div>; }

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorLandingPage /> },
  {
    path: "/", element: <ProtectedRoutes />, errorElement: <RouteErrorLandingPage />,
    children: [
      { element: <CompanySettingsProvider><NorthstarLayout /></CompanySettingsProvider>, children: [
        { index: true, element: <HomePage /> },
        { path: "vendors", element: <PlaceholderPage title="Vendors" /> },
        { path: "timesheets", element: <PlaceholderPage title="Timesheets" /> },
        { path: "expense-reports", element: <PlaceholderPage title="Expense Reports" /> },
        { path: "report-warehouse", element: <PlaceholderPage title="Report Warehouse" /> },
        { path: "quick-reports", element: <PlaceholderPage title="Quick Reports" /> },
        { path: "company-settings", element: <CompanySettingsPage /> },
        { path: "proposal-generator", element: <PlaceholderPage title="Proposal Generator" /> },
        { path: "settings", element: <PlaceholderPage title="User Settings" /> },
        { element: <ProtectedRoutes allowedGroupIds={PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS} />, children: [
          { path: "invoices", element: <PlaceholderPage title="Invoices" /> },
          { path: "clients", element: <ClientsPage /> },
          { path: "projects", element: <ProjectsPage /> },
        ] },
      ] },
    ],
  },
  { path: "*", element: <ErrorLandingPage /> },
]);

export default function App() {
  return <MsalProvider instance={msalInstance}><AuthProvider><Suspense fallback={<RouteLoading />}><RouterProvider router={router} /></Suspense></AuthProvider></MsalProvider>;
}

function PlaceholderPage({ title }: { title: string }) {
  return <section className="rounded-lg border border-neutral-300 bg-neutral-50 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"><h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-50">{title}</h1><p className="mt-2 text-neutral-700 dark:text-neutral-300">This route is ready for migration from document PM workflows.</p></section>;
}
