import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ClientExtraData, ClientListItem, Contact, NorthstarClient, NorthstarPageSize, NorthstarPagination, ProjectListItem } from "cfdg/types";
import { ArrowLeft, FolderKanban, MailPlus, Plus, RefreshCw, Search, SquareArrowOutUpRight } from "lucide-react";
import { createClientContact, fetchClient, fetchClientContacts, fetchClientExtraData, fetchClientProjects, fetchClients, updateClientContact } from "../../api/clients";
import { NorthstarApiError } from "../../api/client";
import { PaginationControls, PropertyList, RecordStatus, SortHeading } from "../../components/NorthstarRecords";

const EMPTY_PAGINATION: NorthstarPagination = { page: 1, pageSize: 25, totalRecords: 0, totalPages: 0 };

/** Northstar client list and independently loaded client detail sheet. */
export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";
  const action = searchParams.get("action")?.trim() || "";
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [selectedClient, setSelectedClient] = useState<NorthstarClient | null>(null);
  const [extraData, setExtraData] = useState<ClientExtraData | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactDraft, setContactDraft] = useState<Contact | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [extraLoading, setExtraLoading] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = id ? "Client Detail - Northstar" : "Clients - Northstar";
  }, [id]);

  useEffect(() => {
    if (id) return;
    let cancelled = false;
    setListLoading(true);
    setListError("");
    void fetchClients({ page: pagination.page, pageSize: pagination.pageSize, direction })
      .then((response) => {
        if (!cancelled) {
          setClients(response.clients);
          setPagination(response.pagination);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(String(error));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => { cancelled = true; };
  }, [direction, id, pagination.page, pagination.pageSize, refreshKey]);

  useEffect(() => {
    if (!id) {
      setSelectedClient(null);
      setExtraData(null);
      setProjects([]);
      setContacts([]);
      setNotFound(false);
      setDetailError("");
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setExtraLoading(false);
    setRelationshipLoading(false);
    setSelectedClient(null);
    setExtraData(null);
    setProjects([]);
    setContacts([]);
    setNotFound(false);
    setDetailError("");
    setContactDraft(null);
    setActionNotice(action === "report" ? "Quick reporting is queued for the next Northstar workflow slice." : "");

    void fetchClient(id)
      .then((client) => {
        if (cancelled) return;
        setSelectedClient(client);
        setDetailLoading(false);
        setExtraLoading(true);
        setContactsLoading(true);
        void fetchClientExtraData(id)
          .then((data) => { if (!cancelled) setExtraData(data); })
          .catch((error: unknown) => { if (!cancelled) setDetailError(`Client status failed to load: ${String(error)}`); })
          .finally(() => { if (!cancelled) setExtraLoading(false); });
        setRelationshipLoading(true);
        void fetchClientProjects(id)
          .then((related) => { if (!cancelled) setProjects(related); })
          .catch((error: unknown) => { if (!cancelled) setDetailError(`Client projects failed to load: ${String(error)}`); })
          .finally(() => { if (!cancelled) setRelationshipLoading(false); });
        void fetchClientContacts(id)
          .then((data) => { if (!cancelled) { setContacts(data); if (action === "create-contact") setContactDraft({ id: "", name: "", email: "", phone: "", title: "", pointOfContact: false, receiveInvoices: false, active: true }); } })
          .catch((error: unknown) => { if (!cancelled) setDetailError(`Client contacts failed to load: ${String(error)}`); })
          .finally(() => { if (!cancelled) setContactsLoading(false); });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (error instanceof NorthstarApiError && error.status === 404) setNotFound(true);
        else setDetailError(String(error));
      });
    return () => { cancelled = true; };
  }, [action, id]);

  const clientProperties = useMemo(() => {
    if (!selectedClient) return [];
    return [
      { label: "QBO ID", value: selectedClient.id },
      { label: "Name", value: selectedClient.displayName || selectedClient.fullyQualifiedName },
      { label: "Full name", value: selectedClient.fullyQualifiedName },
      { label: "Company", value: selectedClient.companyName },
      { label: "Contact", value: selectedClient.primaryEmail || selectedClient.primaryPhone },
      { label: "Billing address", value: formatAddress(selectedClient.billAddrLine1, selectedClient.billAddrLine2, selectedClient.billAddrCity, selectedClient.billAddrState, selectedClient.billAddrPostalCode) },
      { label: "Shipping address", value: formatAddress(selectedClient.shipAddrLine1, selectedClient.shipAddrLine2, selectedClient.shipAddrCity, selectedClient.shipAddrState, selectedClient.shipAddrPostalCode) },
      { label: "QBO active", value: selectedClient.active ? "Yes" : "No" },
      { label: "Last synced", value: selectedClient.lastSyncedDate },
    ];
  }, [selectedClient]);

  function returnToList() {
    setSearchParams({});
  }

  function changePage(page: number) {
    setPagination((current) => ({ ...current, page }));
  }

  function changePageSize(pageSize: NorthstarPageSize) {
    setPagination((current) => ({ ...current, page: 1, pageSize }));
  }

  function newContact() {
    setContactDraft({ id: "", name: "", email: "", phone: "", title: "", pointOfContact: false, receiveInvoices: false, active: true });
  }

  async function saveContact(contact: Contact) {
    if (!id) return;
    setContactSaving(true);
    try {
      const saved = contact.id ? await updateClientContact(id, contact) : await createClientContact(id, contact);
      setContacts((current) => contact.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setContactDraft(null);
    } catch (error: unknown) { setActionNotice(String(error)); }
    finally { setContactSaving(false); }
  }

  if (id) {
    return (
      <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ActionButton label="Back" icon={<ArrowLeft className="size-4" />} onClick={returnToList} />
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#607d8b] dark:text-[#9cc4c9]">Northstar / Clients</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{selectedClient?.displayName || (detailLoading ? "Loading client" : "Client detail")}</h1>
            </div>
          </div>
          {selectedClient && <div className="flex flex-wrap gap-2"><ActionButton label="Create Contact" icon={<MailPlus className="size-4" />} onClick={newContact} /><ActionButton label="Create Project" icon={<Plus className="size-4" />} onClick={() => navigate(`/projects?clientId=${encodeURIComponent(selectedClient.id)}&action=create`)} primary /><ActionButton label="Quick Report" icon={<Search className="size-4" />} onClick={() => navigate(`/quick-reports?clientId=${encodeURIComponent(selectedClient.id)}`)} /></div>}
        </div>
        {detailLoading && <LoadingPanel label="Loading client record..." />}
        {notFound && <EmptyPanel label="NO ID FOUND" />}
        {detailError && <ErrorPanel message={detailError} />}
        {selectedClient && !detailLoading && (
          <section className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            {actionNotice && <Notice message={actionNotice} />}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-700">
              <div><p className="text-xs uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">Client status</p><div className="mt-1">{extraLoading ? <span className="text-sm text-neutral-500">Loading status...</span> : <RecordStatus value={extraData?.status || "active"} />}</div></div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Base record loaded independently from client extra data</span>
            </div>
            <PropertyList properties={clientProperties} />
            <ContactList contacts={contacts} loading={contactsLoading} draft={contactDraft} onEdit={setContactDraft} onDraftChange={setContactDraft} onSave={saveContact} onCancel={() => setContactDraft(null)} saving={contactSaving} />
            <section className="rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700"><h2 className="flex items-center gap-2 text-sm font-semibold"><FolderKanban className="size-4 text-[#607d8b]" />Projects</h2><span className="text-xs text-neutral-500">{relationshipLoading ? "Loading..." : `${projects.length} linked`}</span></div>
              {projects.length === 0 && !relationshipLoading ? <p className="px-3 py-5 text-sm text-neutral-500">No projects are linked to this client.</p> : <div className="divide-y divide-neutral-200 dark:divide-neutral-700">{projects.map((project) => <Link key={project.id} to={`/projects?id=${encodeURIComponent(project.id)}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#173244]/30 dark:hover:bg-neutral-800"><span className="font-semibold">{project.fullName}</span><RecordStatus value={project.status} /></Link>)}</div>}
            </section>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#607d8b] dark:text-[#9cc4c9]">Northstar / Operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Clients</h1><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Top-level QuickBooks customers and their linked survey work.</p></div>
        <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="inline-flex items-center gap-2 rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#173244]/30 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"><RefreshCw className={`size-4 ${listLoading ? "animate-spin" : ""}`} />Refresh</button>
      </header>
      <section className="overflow-hidden rounded-md border border-neutral-300 bg-neutral-50 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        {listError && <ErrorPanel message={listError} />}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr className="border-b border-neutral-300 text-left dark:border-neutral-700"><th className="px-3 py-2"><SortHeading direction={direction} onToggle={() => { setDirection((current) => current === "asc" ? "desc" : "asc"); setPagination((current) => ({ ...current, page: 1 })); }} /></th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2 text-right">Quick actions</th></tr></thead><tbody>{listLoading && <tr><td colSpan={4}><LoadingPanel label="Loading clients..." /></td></tr>}{!listLoading && clients.length === 0 && <tr><td colSpan={4}><EmptyPanel label="No clients found." /></td></tr>}{!listLoading && clients.map((client) => <tr key={client.id} className="border-b border-neutral-200 align-middle last:border-0 dark:border-neutral-700"><td className="px-3 py-3"><Link to={`/clients?id=${encodeURIComponent(client.id)}`} className="inline-flex items-center gap-2 font-semibold hover:text-[#173244] focus:outline-none focus:ring-2 focus:ring-[#173244]/30 dark:hover:text-[#9cc4c9]"><span>{client.fullName}</span><SquareArrowOutUpRight className="size-3.5 opacity-50" /></Link><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{client.fullyQualifiedName || client.id}</p></td><td className="px-3 py-3"><RecordStatus value={client.status} /></td><td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{client.primaryEmail || client.primaryPhone || "—"}</td><td className="px-3 py-3"><div className="flex justify-end gap-2"><ActionButton label="Create Contact" icon={<MailPlus className="size-3.5" />} onClick={() => setSearchParams({ id: client.id, action: "create-contact" })} /><ActionButton label="Create Project" icon={<Plus className="size-3.5" />} onClick={() => navigate(`/projects?clientId=${encodeURIComponent(client.id)}&action=create`)} /><ActionButton label="Quick Report" icon={<Search className="size-3.5" />} onClick={() => navigate(`/quick-reports?clientId=${encodeURIComponent(client.id)}`)} /></div></td></tr>)}</tbody></table></div>
        <PaginationControls pagination={pagination} onPageChange={changePage} onPageSizeChange={changePageSize} />
      </section>
    </div>
  );
}

function formatAddress(line1: string, line2: string, city: string, state: string, postalCode: string) {
  return [line1, line2, [city, state].filter(Boolean).join(", "), postalCode].filter(Boolean).join(" · ");
}

function ContactList({ contacts, loading, draft, onEdit, onDraftChange, onSave, onCancel, saving }: { contacts: Contact[]; loading: boolean; draft: Contact | null; onEdit: (contact: Contact) => void; onDraftChange: (contact: Contact) => void; onSave: (contact: Contact) => void; onCancel: () => void; saving: boolean }) {
  return <section className="rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700"><h2 className="text-sm font-semibold">Contacts</h2><span className="text-xs text-neutral-500">{loading ? "Loading..." : `${contacts.length} total`}</span></div>
    {draft && <ContactForm contact={draft} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} saving={saving} />}
    {!loading && contacts.length === 0 && !draft && <p className="px-3 py-5 text-sm text-neutral-500">No contacts yet. Add a contact to make invoice and project assignments easier.</p>}
    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">{contacts.map((contact) => <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"><div><p className="font-semibold">{contact.name}{contact.title ? <span className="ml-2 font-normal text-neutral-500">{contact.title}</span> : null}</p><p className="text-neutral-600 dark:text-neutral-300">{contact.email}{contact.phone ? ` · ${contact.phone}` : ""}</p><div className="mt-1 flex flex-wrap gap-1.5 text-[0.68rem] uppercase tracking-wide"><Badge active={contact.pointOfContact}>Point of contact</Badge><Badge active={contact.receiveInvoices}>Invoices</Badge><Badge active={contact.active}>Active</Badge></div></div><button type="button" onClick={() => onEdit(contact)} className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800">Edit</button></div>)}</div>
  </section>;
}

function ContactForm({ contact, onChange, onSave, onCancel, saving }: { contact: Contact; onChange: (contact: Contact) => void; onSave: (contact: Contact) => void; onCancel: () => void; saving: boolean }) {
  const inputClass = "rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800";
  const update = (changes: Partial<Contact>) => onChange({ ...contact, ...changes });
  return <div className="grid gap-3 border-b border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-semibold">Name<input autoFocus className={inputClass} value={contact.name} onChange={(event) => update({ name: event.target.value })} /></label><label className="grid gap-1 text-xs font-semibold">Email<input className={inputClass} type="email" value={contact.email} onChange={(event) => update({ email: event.target.value })} /></label><label className="grid gap-1 text-xs font-semibold">Phone <span className="font-normal text-neutral-500">(optional)</span><input className={inputClass} value={contact.phone || ""} onChange={(event) => update({ phone: event.target.value })} /></label><label className="grid gap-1 text-xs font-semibold">Title <span className="font-normal text-neutral-500">(optional)</span><input className={inputClass} value={contact.title || ""} onChange={(event) => update({ title: event.target.value })} /></label></div><div className="flex flex-wrap gap-4 text-sm"><Check label="Point of contact" checked={contact.pointOfContact} onChange={(checked) => update({ pointOfContact: checked })} /><Check label="Receive invoices" checked={contact.receiveInvoices} onChange={(checked) => update({ receiveInvoices: checked })} /><Check label="Active" checked={contact.active} onChange={(checked) => update({ active: checked })} /></div><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => onSave(contact)} className="rounded bg-[#173244] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save contact"}</button><button type="button" disabled={saving} onClick={onCancel} className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600">Cancel</button></div></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="inline-flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function Badge({ active, children }: { active: boolean; children: ReactNode }) { return <span className={`rounded px-1.5 py-0.5 ${active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>{children}</span>; }

function ActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#173244]/30 ${primary ? "border-[#173244] bg-[#173244] text-white hover:bg-[#24495d] dark:border-[#9cc4c9] dark:bg-[#9cc4c9] dark:text-[#10262f]" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"}`}><span>{icon}</span>{label}</button>;
}

function LoadingPanel({ label }: { label: string }) { return <p className="px-3 py-5 text-sm text-neutral-500 dark:text-neutral-400">{label}</p>; }
function EmptyPanel({ label }: { label: string }) { return <p className="px-3 py-8 text-center text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>; }
function ErrorPanel({ message }: { message: string }) { return <p className="m-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-100">{message}</p>; }
function Notice({ message }: { message: string }) { return <p className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">{message}</p>; }
