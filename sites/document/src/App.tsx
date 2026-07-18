import { CommonLayout } from "./components/layout/v2";
import { AuthProvider, ProtectedRoutes } from "./auth/AuthContext";
import * as Pages from "./pages";

// V2 imports
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth/msalConfig";

const router = createBrowserRouter([
  {
    path: '/',
    element: (<CommonLayout />),
    errorElement: <Pages.RouteError />,
    children: [
      { index: true, element: <Pages.HomeV2 /> },
      { path: 'office', element: <Pages.HomeV2 /> },
      { path: 'login', element: <Pages.Login /> },
      { path: 'tools/level-run', element: <Pages.LevelRun /> },
      { path: 'tools/slope-calculator', element: <Pages.SlopeCalculator /> },
      { path: 'tools/prorate-calculator', element: <Pages.ProrateCalculator /> },
      { path: 'tools/invert-calculator', element: <Pages.InvertCalculator /> },
      { path: 'tools/field-data-parser', element: <Pages.FieldDataParser /> },
      { path: 'field/data-parser', element: <Pages.FieldDataParser /> },
      { path: 'tools/cxl-editor', element: <Pages.CxlEditor /> },
      { path: 'field/cxl-editor', element: <Pages.CxlEditor /> },
      { path: 'checklists/:checklistType', element: <Pages.Checklist /> },
      { path: 'office/checklists/:checklistType', element: <Pages.Checklist /> },
      { path: 'reference/alta-tablea', element: <Pages.Alta_TableA_2026 /> },
      { path: 'office/alta-tablea', element: <Pages.Alta_TableA_2026 /> },
      { path: 'office/alta-standards', element: <Pages.Alta_Standards_2026 /> },
      {
        path: 'documents/employee-handbook',
        element: <Pages.Documentation markdownFile="/documents/handbooks/employeeHandbook.md" title="Employee Handbook" />,
      },
      { path: '/cst-handbook', element: <Pages.CSTHandbook /> },
      { path: '*', element: <Pages.ErrorPage /> },
      { path: '/404', element: <Pages.ErrorPage /> },
      {
        element: <ProtectedRoutes />,
        children: [
          { path: 'tools/survey-notes', element: <Pages.SurveyNotesTsx /> },
          { path: 'office/survey-notes', element: <Pages.SurveyNotesTsx /> },
          { path: 'tools/comments-manager', element: <Pages.CommentsManager /> },
          { path: 'tools/comments-manager/:packageId', element: <Pages.CommentsManager /> },
          { path: 'office/comments-manager', element: <Pages.CommentsManager /> },
          { path: 'office/comments-manager/:packageId', element: <Pages.CommentsManager /> },
          { path: 'tools/closure-report-generator', element: <Pages.ClosureReportGenerator /> },
          { path: 'office/closure-report-generator', element: <Pages.ClosureReportGenerator /> },
          { path: 'tools/proposal-generator', element: <Pages.ProposalGenerator /> },
        ]
      }
    ]
  },
  {
    path: '/gis',
    element: <Pages.GisMapPage />
  }
]);

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MsalProvider>
  );
}
