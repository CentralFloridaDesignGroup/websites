import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { InvoiceBundle, InvoiceV2, InvoiceV2LineItemInput, Phase, ProjectListItem } from "cfdg/types";
import { fetchProjectPhases, fetchProjects } from "../../api/projects";
import { activateInvoice, activateInvoiceBundle, createInvoice, createInvoiceBundle, deleteInvoice, deleteInvoiceBundle, fetchInvoice, fetchInvoiceBundle, fetchInvoiceBundles, fetchInvoices, retryInvoiceQboSync, updateInvoice, voidInvoice, voidInvoiceBundle } from "../../api/invoices";
import { downloadBundlePdf, downloadInvoicePdf } from "./pdf";

const inputClass = "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50";
const panelClass = "rounded-lg border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800";

function money(cents: number): string { return `$${(cents / 100).toFixed(2)}`; }

function flattenPhases(phases: Phase[], parentPath = ""): InvoiceV2LineItemInput[] {
  return phases.flatMap((phase) => {
    const path = parentPath ? `${parentPath}.${phase.phaseId}` : phase.phaseId;
    const rows: InvoiceV2LineItemInput[] = [];
    if (phase.subPhases.length) rows.push({ phaseId: phase.id, qboId: phase.qboId, lineType: "informational", phasePath: path, phaseIdentifier: phase.phaseId, phaseName: phase.name, description: phase.name, percentComplete: 0, amountCents: 0, sortOrder: rows.length });
    if (phase.subPhases.length) rows.push(...flattenPhases(phase.subPhases, path));
    else if (phase.active && phase.billable) rows.push({ phaseId: phase.id, qboId: phase.qboId, lineType: "billable", phasePath: path, phaseIdentifier: phase.phaseId, phaseName: phase.name, description: phase.description || phase.name, percentComplete: 0, amountCents: 0, sortOrder: rows.length });
    return rows;
  });
}

export function InvoicesPage() {
  const [params] = useSearchParams();
  const projectId = params.get("projectId") || "";
  const [invoices, setInvoices] = useState<InvoiceV2[]>([]);
  const [bundles, setBundles] = useState<InvoiceBundle[]>([]);
  const [selected, setSelected] = useState<InvoiceV2 | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<InvoiceBundle | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectOptions, setProjectOptions] = useState<ProjectListItem[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [newInvoiceProjectId, setNewInvoiceProjectId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [invoiceResponse, bundleResponse] = await Promise.all([
        fetchInvoices({ page: 1, pageSize: 100, status: status || undefined, projectId: projectId || undefined, search: search || undefined }),
        fetchInvoiceBundles({ page: 1, pageSize: 100, search: search || undefined }),
      ]);
      setInvoices(invoiceResponse.invoices);
      setBundles(bundleResponse.bundles);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load invoices"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [status, search, projectId]);

  async function createDraftForProject(selectedProjectId: string) {
    try {
      const [phases] = await Promise.all([fetchProjectPhases(selectedProjectId)]);
      const invoice = await createInvoice(selectedProjectId, { dueType: "dueOnReceipt", lineItems: flattenPhases(phases.phases) });
      setSelected(invoice);
      setProjectPickerOpen(false);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create invoice"); }
  }

  async function startDraft() {
    setError("");
    if (projectId) {
      await createDraftForProject(projectId);
      return;
    }

    setProjectPickerOpen(true);
    setProjectLoading(true);
    try {
      const response = await fetchProjects({ page: 1, pageSize: 100, direction: "asc" });
      setProjectOptions(response.projects);
      setNewInvoiceProjectId((current) => current || response.projects[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load projects");
    } finally {
      setProjectLoading(false);
    }
  }

  async function openInvoice(id: string) { try { setSelected(await fetchInvoice(id)); setSelectedBundle(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load invoice"); } }
  async function openBundle(id: string) { try { setSelectedBundle(await fetchInvoiceBundle(id)); setSelected(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load bundle"); } }

  async function makeBundle() {
    const draftInvoices = invoices.filter((invoice) => selectedDrafts.includes(invoice.id) && invoice.status === "draft");
    if (!draftInvoices.length) { setError("Select at least one draft invoice from the same client."); return; }
    try {
      const bundle = await createInvoiceBundle({ qboCustomerId: draftInvoices[0].qboCustomerId, dueType: "dueOnReceipt", invoiceIds: draftInvoices.map((invoice) => invoice.id) });
      setSelectedBundle(bundle); setSelected(null); setSelectedDrafts([]); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create bundle"); }
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Invoices</h1><p className="text-sm text-neutral-600 dark:text-neutral-300">Draft, activate, and track project invoices.</p></div>
      <div className="flex flex-wrap gap-2"><button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-950" onClick={() => void startDraft()}>New Invoice</button><button className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600" onClick={() => void makeBundle()}>Bundle Selected Drafts</button></div>
    </div>
    {projectPickerOpen && <section className={panelClass}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Create New Invoice</h2><p className="text-sm text-neutral-600 dark:text-neutral-300">Choose the project that should supply the invoice snapshot and phase line items.</p></div><button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600" onClick={() => setProjectPickerOpen(false)}>Cancel</button></div>{projectLoading ? <p className="mt-4 text-sm">Loading projects...</p> : <div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid min-w-[min(100%,32rem)] flex-1 gap-1 text-sm">Project<select className={inputClass} value={newInvoiceProjectId} onChange={(event) => setNewInvoiceProjectId(event.target.value)}><option value="">Select a project</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.fullName}{project.parentDisplayName ? " · " + project.parentDisplayName : ""}</option>)}</select></label><button disabled={!newInvoiceProjectId} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void createDraftForProject(newInvoiceProjectId)}>Create Draft</button></div>}</section>}
    {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{error}</div>}
    <div className={panelClass + " flex flex-wrap gap-3"}><input className={inputClass} placeholder="Search invoice number" value={search} onChange={(event) => setSearch(event.target.value)} /><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="void">Void</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select>{projectId && <Link className="text-sm text-blue-700 underline dark:text-blue-300" to={`/projects/${encodeURIComponent(projectId)}`}>Return to project</Link>}</div>
    {loading ? <div className={panelClass}>Loading invoices...</div> : <>
      <InvoiceTable invoices={invoices} selectedDrafts={selectedDrafts} onToggleDraft={(id) => setSelectedDrafts((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} onOpen={(id) => void openInvoice(id)} />
      <BundleTable bundles={bundles} onOpen={(id) => void openBundle(id)} />
    </>}
    {selected && <InvoiceEditor invoice={selected} onChanged={(invoice) => { setSelected(invoice); void load(); }} onClose={() => setSelected(null)} />}
    {selectedBundle && <BundleEditor bundle={selectedBundle} onChanged={(bundle) => { setSelectedBundle(bundle); void load(); }} onClose={() => setSelectedBundle(null)} />}
  </div>;
}

function InvoiceTable({ invoices, selectedDrafts, onToggleDraft, onOpen }: { invoices: InvoiceV2[]; selectedDrafts: string[]; onToggleDraft: (id: string) => void; onOpen: (id: string) => void }) {
  return <section className={panelClass}><h2 className="mb-3 text-lg font-semibold">Invoices</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-neutral-300 dark:border-neutral-600"><th className="p-2">Bundle</th><th className="p-2">Number</th><th className="p-2">Project</th><th className="p-2">Status</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-b border-neutral-200 dark:border-neutral-700"><td className="p-2">{invoice.status === "draft" && !invoice.bundleId && <input type="checkbox" checked={selectedDrafts.includes(invoice.id)} onChange={() => onToggleDraft(invoice.id)} />}</td><td className="p-2"><button className="font-semibold text-blue-700 underline dark:text-blue-300" onClick={() => onOpen(invoice.id)}>{invoice.invoiceNumber}</button></td><td className="p-2">{invoice.project.name}</td><td className="p-2 capitalize">{invoice.status}</td><td className="p-2 text-right">{money(invoice.totalCents)}</td></tr>)}</tbody></table>{!invoices.length && <p className="p-3 text-sm text-neutral-600 dark:text-neutral-300">No invoices found.</p>}</div></section>;
}

function BundleTable({ bundles, onOpen }: { bundles: InvoiceBundle[]; onOpen: (id: string) => void }) {
  return <section className={panelClass}><h2 className="mb-3 text-lg font-semibold">Invoice Bundles</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-neutral-300 dark:border-neutral-600"><th className="p-2">Bundle</th><th className="p-2">Invoices</th><th className="p-2">Status</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{bundles.map((bundle) => <tr key={bundle.id} className="border-b border-neutral-200 dark:border-neutral-700"><td className="p-2"><button className="font-semibold text-blue-700 underline dark:text-blue-300" onClick={() => onOpen(bundle.id)}>{bundle.bundleNumber}</button></td><td className="p-2">{bundle.invoices.length}</td><td className="p-2 capitalize">{bundle.status}</td><td className="p-2 text-right">{money(bundle.totalCents)}</td></tr>)}</tbody></table>{!bundles.length && <p className="p-3 text-sm text-neutral-600 dark:text-neutral-300">No bundles found.</p>}</div></section>;
}

function InvoiceEditor({ invoice, onChanged, onClose }: { invoice: InvoiceV2; onChanged: (invoice: InvoiceV2) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(invoice);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setDraft(invoice), [invoice]);
  const editable = draft.status === "draft";
  const total = useMemo(() => draft.lineItems.filter((line) => line.lineType === "billable").reduce((sum, line) => sum + line.amountCents, 0), [draft.lineItems]);

  async function save() {
    setBusy(true); setMessage("");
    try {
      const updated = await updateInvoice(draft.id, { dueType: draft.dueType, notes: draft.notes, internalNotes: draft.internalNotes, lineItems: draft.lineItems.map((line) => ({ phaseId: line.phaseId || null, qboId: line.qboId || null, lineType: line.lineType, description: line.description, percentComplete: line.percentComplete, amountCents: line.amountCents, sortOrder: line.sortOrder })) });
      onChanged(updated); setMessage("Draft saved.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to save draft"); }
    finally { setBusy(false); }
  }
  async function action(action: () => Promise<InvoiceV2>, success: string) { setBusy(true); setMessage(""); try { const updated = await action(); onChanged(updated); setMessage(success); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Action failed"); } finally { setBusy(false); } }

  return <section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Invoice {draft.invoiceNumber}</h2><p className="text-sm capitalize text-neutral-600 dark:text-neutral-300">{draft.status} · {draft.project.name}</p></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600" onClick={() => downloadInvoicePdf(draft)}>PDF</button>{editable && <><button disabled={busy} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-neutral-100 dark:text-neutral-950" onClick={() => void save()}>Save Draft</button><button disabled={busy} className="rounded-md bg-blue-700 px-3 py-1.5 text-sm text-white" onClick={() => void action(() => activateInvoice(draft.id), "Invoice activated.")}>Activate</button></>}{draft.status === "active" && <><button disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-700 dark:text-red-300" onClick={() => void action(() => voidInvoice(draft.id), "Invoice voided.")}>Void</button>{draft.qbo.status === "failed" && <button disabled={busy} className="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 dark:border-amber-700 dark:text-amber-300" onClick={() => void action(() => retryInvoiceQboSync(draft.id), "QBO sync complete.")}>Retry QBO</button>}</>}{editable && <button disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700" onClick={() => void action(async () => { await deleteInvoice(draft.id); onClose(); return draft; }, "Draft deleted.")}>Delete</button>}<button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600" onClick={onClose}>Close</button></div></div>{message && <p className="my-3 text-sm text-neutral-600 dark:text-neutral-300">{message}</p>}<div className="mt-4 grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm">Due terms<select disabled={!editable} className={inputClass} value={draft.dueType} onChange={(event) => setDraft({ ...draft, dueType: event.target.value as InvoiceV2["dueType"] })}><option value="dueOnReceipt">Due on Receipt</option><option value="net30">NET30</option><option value="net45">NET45</option><option value="net60">NET60</option><option value="payWhenPaid">Pay When Paid</option></select></label><div className="text-sm"><span className="font-medium">Purchase Order</span><p className="mt-1 rounded-md bg-neutral-200 px-2 py-1.5 dark:bg-neutral-700">{draft.purchaseOrder || "None"}</p></div><div className="text-sm"><span className="font-medium">QBO Sync</span><p className="mt-1 rounded-md bg-neutral-200 px-2 py-1.5 dark:bg-neutral-700">{draft.qbo.status}{draft.qbo.message ? `: ${draft.qbo.message}` : ""}</p></div></div><label className="mt-3 grid gap-1 text-sm">Client notes<textarea disabled={!editable} className={inputClass} rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-neutral-300 dark:border-neutral-600"><th className="p-2">Description</th><th className="p-2">Type</th><th className="p-2">%</th><th className="p-2">Contract</th><th className="p-2">Current bill</th></tr></thead><tbody>{draft.lineItems.map((line, index) => <tr key={line.id || `${line.phaseId}-${index}`} className={`border-b border-neutral-200 dark:border-neutral-700 ${line.lineType === "informational" ? "italic opacity-70" : ""}`}><td className="p-2">{line.phasePath ? `${line.phasePath} - ` : ""}{line.description || line.phaseName}</td><td className="p-2">{line.lineType}</td><td className="p-2">{line.lineType === "billable" ? <input disabled={!editable} className={inputClass + " w-24"} type="number" min="0" max="100" step="0.01" value={line.percentComplete} onChange={(event) => setDraft({ ...draft, lineItems: draft.lineItems.map((value, itemIndex) => itemIndex === index ? { ...value, percentComplete: Number(event.target.value) } : value) })} /> : ""}</td><td className="p-2">{line.lineType === "billable" ? money(line.contractCents) : ""}</td><td className="p-2">{line.lineType === "billable" ? <input disabled={!editable} className={inputClass + " w-28"} type="number" min="0" step="1" value={line.amountCents} onChange={(event) => setDraft({ ...draft, lineItems: draft.lineItems.map((value, itemIndex) => itemIndex === index ? { ...value, amountCents: Number(event.target.value) } : value) })} /> : "Summary"}</td></tr>)}</tbody></table></div><div className="mt-4 text-right text-lg font-semibold">TOTAL: {money(total)}</div></section>;
}

function BundleEditor({ bundle, onChanged, onClose }: { bundle: InvoiceBundle; onChanged: (bundle: InvoiceBundle) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function action(actionFn: () => Promise<InvoiceBundle>, success: string) { setBusy(true); try { const updated = await actionFn(); onChanged(updated); setMessage(success); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Bundle action failed"); } finally { setBusy(false); } }
  return <section className={panelClass}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Bundle {bundle.bundleNumber}</h2><p className="text-sm capitalize text-neutral-600 dark:text-neutral-300">{bundle.status} · {bundle.invoices.length} invoices</p></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600" onClick={() => downloadBundlePdf(bundle)}>PDF</button>{bundle.status === "draft" && <><button disabled={busy} className="rounded-md bg-blue-700 px-3 py-1.5 text-sm text-white" onClick={() => void action(() => activateInvoiceBundle(bundle.id), "Bundle activated.")}>Activate</button><button disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700" onClick={() => void (async () => { setBusy(true); try { await deleteInvoiceBundle(bundle.id); onClose(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Unable to delete bundle"); } finally { setBusy(false); } })()}>Delete Draft</button></>}{bundle.status === "active" && <button disabled={busy} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700" onClick={() => void action(() => voidInvoiceBundle(bundle.id), "Bundle voided.")}>Void</button>}<button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600" onClick={onClose}>Close</button></div></div>{message && <p className="my-3 text-sm text-neutral-600 dark:text-neutral-300">{message}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-neutral-300 dark:border-neutral-600"><th className="p-2">Invoice</th><th className="p-2">Project</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{bundle.invoices.map((invoice) => <tr key={invoice.id} className="border-b border-neutral-200 dark:border-neutral-700"><td className="p-2">{invoice.invoiceNumber}</td><td className="p-2">{invoice.project.name}</td><td className="p-2 text-right">{money(invoice.totalCents)}</td></tr>)}</tbody></table></div><div className="mt-4 text-right text-lg font-semibold">TOTAL: {money(bundle.totalCents)}</div></section>;
}
