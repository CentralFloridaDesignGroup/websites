import { useNavigate, useRouteError } from "react-router-dom";
import { ArrowLeft, Compass, Home, RefreshCw } from "lucide-react";
import { NorthstarButton as Button } from "cfdg/ui/input";

type ErrorLandingPageProps = {
  variant?: "not-found" | "application-error";
  error?: unknown;
};

function formatError(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const routeError = error as { status?: unknown; statusText?: unknown; data?: unknown; message?: unknown };
    const status = routeError.status ? `HTTP ${String(routeError.status)}` : "";
    const statusText = routeError.statusText ? String(routeError.statusText) : "";
    const message = routeError.message ? String(routeError.message) : "";
    const data = typeof routeError.data === "string"
      ? routeError.data
      : routeError.data ? JSON.stringify(routeError.data, null, 2) : "";
    return [status, statusText, message, data].filter(Boolean).join("\n");
  }

  return String(error);
}

/** Renders the router's captured error inside the Northstar recovery page. */
export function RouteErrorLandingPage() {
  return <ErrorLandingPage variant="application-error" error={useRouteError()} />;
}

/** A branded recovery page for unknown routes and unexpected application errors. */
export function ErrorLandingPage({ variant = "not-found", error }: ErrorLandingPageProps) {
  const navigate = useNavigate();
  const isApplicationError = variant === "application-error";
  const errorDetails = formatError(error);

  function goHome() {
    navigate("/", { replace: true });
  }

  function retry() {
    window.location.reload();
  }

  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900 text-primary dark:text-primary-500">
      <div
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23,50,68,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(23,50,68,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -right-32 -top-40 size-[34rem] rounded-full border border-primary/20 dark:border-[#51c4c5]/15" />
      <div className="pointer-events-none absolute -right-16 -top-24 size-[24rem] rounded-full border border-primary/20 dark:border-[#51c4c5]/15" />
      <div className="pointer-events-none absolute left-[11%] top-[18%] size-3 rounded-full bg-[#d3754b] shadow-[0_0_0_8px_rgba(211,117,75,0.12)]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
        <header className="flex items-center gap-3">
          <img src="/northstar-icon.svg" alt="" className="size-15 dark:hidden" />
          <img src="/northstar-icon-dark.webp" alt="" className="hidden size-15 dark:block" />
          <span className="text-lg font-semibold uppercase tracking-[0.24em]">Northstar</span>
        </header>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-primary dark:text-primary-500">
              <span className="h-px w-8 bg-current" />
              {isApplicationError ? "Signal interrupted" : "Off the plotted course"}
            </p>
            <h1 className="max-w-lg text-5xl font-semibold leading-[0.98] tracking-[-0.05em] text-[#173244] dark:text-[#edf6f4] sm:text-7xl">
              {isApplicationError ? "Northstar needs a fresh fix." : "This page isn’t on the map."}
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#48616b] dark:text-[#a9c0c3]">
              {isApplicationError
                ? "Something unexpected interrupted this view. Reload the workspace and try again."
                : "The address may be outdated, or the route may have moved. Set a new bearing from the workspace home."
              }
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                type="button"
                colorMode="auto"
                onClick={isApplicationError ? retry : goHome}
                buttonStyle="focused"
                className=""
              >
                {isApplicationError ? <RefreshCw className="size-4" aria-hidden="true" /> : <Home className="size-4" aria-hidden="true" />}
                {isApplicationError ? "Reload workspace" : "Return to home"}
              </Button>
              <Button
                type="button"
                colorMode="auto"
                onClick={() => window.history.back()}
                buttonStyle="secondary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Go back
              </Button>
            </div>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[22rem] items-center justify-center rounded-full border border-primary/25 bg-[#dce9e6]/50 shadow-[0_24px_80px_rgba(29,130,145,0.12)] dark:border-[#51c4c5]/20 dark:bg-[#183039]/50">
            <div className="absolute inset-8 rounded-full border border-primary/25 dark:border-[#51c4c5]/20" />
            <div className="absolute inset-16 rounded-full border border-dashed border-primary/30 dark:border-[#51c4c5]/25" />
            <div className="absolute h-px w-[78%] bg-primary/25 dark:bg-[#51c4c5]/20" />
            <div className="absolute h-[78%] w-px bg-primary/25 dark:bg-[#51c4c5]/20" />
            <div className="absolute right-[15%] top-[18%] text-[0.6rem] font-bold tracking-[0.3em] text-primary dark:text-primary-500">N</div>
            <Compass className="relative size-24 stroke-[1.1] text-primary dark:text-primary-500" aria-hidden="true" />
            <span className="absolute bottom-[17%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#597278] dark:text-[#86a9aa]">
              Recalculate bearing
            </span>
          </div>
        </section>

        {errorDetails && (
          <div className="mt-2 max-w-7xl overflow-hidden rounded-md border border-[#b6c8c7] bg-white/60 text-left shadow-sm dark:border-[#304a52] dark:bg-neutral-800/70">
            <div className="flex items-center justify-between border-b border-[#b6c8c7] px-4 py-2 dark:border-[#304a52]">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base dark:text-white">Technical details</span>
              <span className="font-mono text-[0.65rem] text-[#597278] dark:text-[#86a9aa]">LOG / ROUTER</span>
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-5 text-[#264958] dark:text-[#c7dddd]">{errorDetails}</pre>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-[#b6c8c7] pt-5 text-xs text-[#597278] dark:border-[#304a52] dark:text-[#86a9aa]">
          <span>White Point Survey</span>
          <span className="font-mono">{isApplicationError ? "ERR / 500" : "ERR / 404"}</span>
        </footer>
      </div>
    </main>
  );
}
