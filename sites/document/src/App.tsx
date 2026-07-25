import { CommonLayout } from "./components/layout/v2";
import { AuthProvider, ProtectedRoutes } from "./auth/AuthContext";
import { ErrorPage, HomeV2, Login, RouteError } from "./pages/v2";
import { PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS } from "@wps/scripts/types/projectManagement";

// V2 imports
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalConfig";

const LevelRun = lazy(() => import("./pages/office/calculator/levelRun/levelRun").then((module) => ({ default: module.LevelRun })));
const SlopeCalculator = lazy(() => import("./pages/office/calculator/slope/slope").then((module) => ({ default: module.SlopeCalculator })));
const ProrateCalculator = lazy(() => import("./pages/office/calculator/prorate/prorate").then((module) => ({ default: module.ProrateCalculator })));
const InvertCalculator = lazy(() => import("./pages/office/calculator/inverts/inverts").then((module) => ({ default: module.InvertCalculator })));
const FieldDataParser = lazy(() => import("./pages/field/tools/fieldDataParser/fieldDataParser").then((module) => ({ default: module.FieldDataParser })));
const CxlEditor = lazy(() => import("./pages/field/tools/cxlEditor/LayeredCxlEditor").then((module) => ({ default: module.LayeredCxlEditor })));
const Checklist = lazy(() => import("./pages/office/checklists/checklist"));
const AltaTableA2026 = lazy(() => import("./pages/office/Alta_TableA_2026").then((module) => ({ default: module.Alta_TableA_2026 })));
const AltaStandards2026 = lazy(() => import("./pages/office/alta_standards_2026"));
const Documentation = lazy(() => import("./pages/general/documentation").then((module) => ({ default: module.Documentation })));
const CSTHandbook = lazy(() => import("./pages/general/CSTHandbook").then((module) => ({ default: module.CSTHandbook })));
const SurveyNotesTsx = lazy(() => import("./pages/office/SurveyorNotesTsx/SurveyorNotes"));
const CommentsManager = lazy(() => import("./pages/pm/commentsManager/CommentsManager").then((module) => ({ default: module.CommentsManager })));
const ClosureReportGenerator = lazy(() => import("./pages/pm/ClosureReportGenerator/ClosureReportGenerator").then((module) => ({ default: module.ClosureReportGenerator })));
const ProposalGenerator = lazy(() => import("./pages/pm/ProposalLanguageGenerator/ProposalGenerator").then((module) => ({ default: module.ProposalGenerator })));
const InvoicesManager = lazy(() => import("./pages/pm/invoices/Invoices").then((module) => ({ default: module.InvoicesManager })));
const PayInvoicePage = lazy(() => import("./pages/pm/invoices/Invoices").then((module) => ({ default: module.PayInvoicePage })));
const ClientsManager = lazy(() => import("./pages/pm/clients/Clients").then((module) => ({ default: module.ClientsManager })));
const ProjectsManager = lazy(() => import("./pages/pm/projects/Projects").then((module) => ({ default: module.ProjectsManager })));
const GisMapPage = lazy(() => import("./pages/office/Gis/Gis"));

function RouteLoading() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center text-sm text-slate-600 dark:text-slate-300">
      Loading...
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (<CommonLayout />),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeV2 /> },
      { path: 'office', element: <HomeV2 /> },
      { path: 'login', element: <Login /> },
      { path: 'tools/level-run', element: <LevelRun /> },
      { path: 'tools/slope-calculator', element: <SlopeCalculator /> },
      { path: 'tools/prorate-calculator', element: <ProrateCalculator /> },
      { path: 'tools/invert-calculator', element: <InvertCalculator /> },
      { path: 'tools/field-data-parser', element: <FieldDataParser /> },
      { path: 'field/data-parser', element: <FieldDataParser /> },
      { path: 'tools/cxl-editor', element: <CxlEditor /> },
      { path: 'field/cxl-editor', element: <CxlEditor /> },
      { path: 'checklists/:checklistType', element: <Checklist /> },
      { path: 'office/checklists/:checklistType', element: <Checklist /> },
      { path: 'reference/alta-tablea', element: <AltaTableA2026 /> },
      { path: 'office/alta-tablea', element: <AltaTableA2026 /> },
      { path: 'office/alta-standards', element: <AltaStandards2026 /> },
      {
        path: 'documents/employee-handbook',
        element: <Documentation markdownFile="/documents/handbooks/employeeHandbook.md" title="Employee Handbook" />,
      },
      { path: '/cst-handbook', element: <CSTHandbook /> },
      { path: '*', element: <ErrorPage /> },
      { path: '/404', element: <ErrorPage /> },
      {
        element: <ProtectedRoutes />,
        children: [
          { path: 'tools/survey-notes', element: <SurveyNotesTsx /> },
          { path: 'office/survey-notes', element: <SurveyNotesTsx /> },
          { path: 'tools/comments-manager', element: <CommentsManager /> },
          { path: 'tools/comments-manager/:packageId', element: <CommentsManager /> },
          { path: 'office/comments-manager', element: <CommentsManager /> },
          { path: 'office/comments-manager/:packageId', element: <CommentsManager /> },
          { path: 'tools/closure-report-generator', element: <ClosureReportGenerator /> },
          { path: 'office/closure-report-generator', element: <ClosureReportGenerator /> },
          { path: 'tools/proposal-generator', element: <ProposalGenerator /> },
        ]
      },
      { path: 'tools/invoices', element: <Navigate to="/invoices" replace /> },
      { path: 'office/invoices', element: <Navigate to="/invoices" replace /> },
      {
        element: <ProtectedRoutes allowedGroupIds={PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS} />,
        children: [
          { path: 'invoices', element: <InvoicesManager /> },
          { path: 'clients', element: <ClientsManager /> },
          { path: 'projects', element: <ProjectsManager /> },
        ]
      }
    ]
  },
  {
    path: '/pay/:token',
    element: <PayInvoicePage />
  },
  {
    path: '/gis',
    element: <GisMapPage />
  }
]);

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </MsalProvider>
  );
}
