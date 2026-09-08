import { useMemo, useState } from "react";
import { Combobox } from "cfdg/input";
import { Modal } from "cfdg/layout";
import type { QboCustomer } from "cfdg/types";
import {
  fetchClientInvoiceReport,
  type ClientInvoiceReport,
} from "../../../api/invoiceReports";
import { downloadClientAccountReportPdf } from "./createClientAccountReportPdf";

function currency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
function date(value: string): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "-";
}

/** Two-stage on-call flow: choose a client, then inspect or export that client's account. */
export function ClientAccountReport({
  clients,
  isOpen,
  onClose,
}: {
  clients: QboCustomer[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [report, setReport] = useState<ClientInvoiceReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selections = useMemo(
    () =>
      clients
        .filter((client) => !client.parentId)
        .map((client) => ({ key: client.displayName, value: client.id })),
    [clients],
  );
  async function load() {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      setReport(await fetchClientInvoiceReport(clientId));
      onClose();
      setDetailsOpen(true);
    } catch (loadError) {
      setError(String(loadError));
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Modal
        title="Client Invoice Report"
        isOpen={isOpen}
        onClose={onClose}
        onAccept={() => void load()}
        acceptText={loading ? "Loading..." : "View report"}
        acceptDisabled={!clientId || loading}
        closeText="Cancel"
        colorMode="auto"
      >
        <p className="mb-4 max-w-xl text-sm text-gray-600 dark:text-gray-300">
          Select a client to view every open invoice, current balance, and
          accounts-receivable aging.
        </p>
        <Combobox
          field="client-account-report"
          label="Client"
          colorMode="auto"
          value={clientId}
          onChange={(_, value) => {
            setClientId(String(value));
            setError("");
          }}
          selections={selections}
        />
        {error && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
            The client report could not be loaded. {error}
          </p>
        )}
      </Modal>
      <Modal
        title={
          report
            ? `${report.clientName || "Client"} - Open invoices`
            : "Client Invoice Report"
        }
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onAccept={() => report && downloadClientAccountReportPdf(report)}
        acceptText="Export PDF"
        acceptDisabled={!report}
        closeText="Close"
        size="5xl"
        colorMode="auto"
      >
        {report && (
          <>
            <div className="grid gap-3 border-b border-gray-200 pb-4 md:grid-cols-3 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Open balance
                </p>
                <p className="text-2xl font-bold">
                  {currency(report.openBalanceCents)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Open invoices
                </p>
                <p className="text-2xl font-bold">{report.openInvoiceCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Past due
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {report.pastDueCount} / {currency(report.pastDueBalanceCents)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
              {Object.entries(report.aging).map(([label, amount]) => (
                <div
                  key={label}
                  className="border-l-2 border-slate-300 pl-2 dark:border-slate-600"
                >
                  <p className="text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="font-semibold">{currency(amount)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                    <th className="py-2">Invoice</th>
                    <th>Project</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th className="text-right">Days overdue</th>
                    <th className="text-right">Amount due</th>
                  </tr>
                </thead>
                <tbody>
                  {report.invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-5 text-center text-gray-500"
                      >
                        This client has no open invoices.
                      </td>
                    </tr>
                  ) : (
                    report.invoices.map((line) => (
                      <tr
                        key={line.invoiceId}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="py-2 font-semibold">
                          {line.invoiceNumber}
                        </td>
                        <td>{line.projectReference || "-"}</td>
                        <td>{date(line.issueDate)}</td>
                        <td>{date(line.dueDate)}</td>
                        <td
                          className={
                            line.daysPastDue
                              ? "text-right font-semibold text-red-700 dark:text-red-300"
                              : "text-right"
                          }
                        >
                          {line.daysPastDue || "-"}
                        </td>
                        <td className="text-right font-semibold">
                          {currency(line.amountDueCents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
