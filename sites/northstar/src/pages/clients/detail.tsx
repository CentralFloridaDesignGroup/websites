import { Link } from "react-router-dom";
import type { Client, Contact, ProjectListItem } from "cfdg/types/v2";
import {
  ArrowLeft,
  FolderKanban,
  MailPlus,
  Plus,
  Search,
} from "lucide-react";
import { PropertyList, RecordStatus } from "../../components/NorthstarRecords";
import {
  ActionButton,
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
  Notice,
} from "./shared";

export type ClientDetailViewProps = {
  client: Client | null;
  projects: ProjectListItem[];
  contacts: Contact[];
  loading: boolean;
  contactsLoading: boolean;
  relationshipLoading: boolean;
  error: string;
  notFound: boolean;
  actionNotice: string;
  contactDraft: Contact | null;
  contactSaving: boolean;
  onBack: () => void;
  onCreateContact: () => void;
  onCreateProject: () => void;
  onQuickReport: () => void;
  onEditContact: (contact: Contact) => void;
  onDraftChange: (contact: Contact) => void;
  onSaveContact: (contact: Contact) => void;
  onCancelContact: () => void;
};

/** Renders the selected client detail sheet and its related records. */
export function ClientDetailView({
  client,
  projects,
  contacts,
  loading,
  contactsLoading,
  relationshipLoading,
  error,
  notFound,
  actionNotice,
  contactDraft,
  contactSaving,
  onBack,
  onCreateContact,
  onCreateProject,
  onQuickReport,
  onEditContact,
  onDraftChange,
  onSaveContact,
  onCancelContact,
}: ClientDetailViewProps) {
  const properties = client ? clientProperties(client) : [];

  return (
    <div className="grid gap-4 text-neutral-950 dark:text-neutral-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ActionButton label="Back" icon={<ArrowLeft className="size-4" />} onClick={onBack} />
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#607d8b] dark:text-[#9cc4c9]">
              Northstar / Clients
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {client?.displayName || (loading ? "Loading client" : "Client detail")}
            </h1>
          </div>
        </div>
        {client && (
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Create Contact" icon={<MailPlus className="size-4" />} onClick={onCreateContact} />
            <ActionButton label="Create Project" icon={<Plus className="size-4" />} onClick={onCreateProject} primary />
            <ActionButton label="Quick Report" icon={<Search className="size-4" />} onClick={onQuickReport} />
          </div>
        )}
      </div>
      {loading && <LoadingPanel label="Loading client record..." />}
      {notFound && <EmptyPanel label="NO ID FOUND" />}
      {error && <ErrorPanel message={error} />}
      {client && !loading && (
        <section className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          {actionNotice && <Notice message={actionNotice} />}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-700">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">Client status</p>
              <div className="mt-1"><RecordStatus value={client.status} /></div>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Base record loaded from Northstar</span>
          </div>
          <PropertyList properties={properties} />
          <ContactList
            contacts={contacts}
            loading={contactsLoading}
            draft={contactDraft}
            onEdit={onEditContact}
            onDraftChange={onDraftChange}
            onSave={onSaveContact}
            onCancel={onCancelContact}
            saving={contactSaving}
          />
          <section className="rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><FolderKanban className="size-4 text-[#607d8b]" />Projects</h2>
              <span className="text-xs text-neutral-500">{relationshipLoading ? "Loading..." : `${projects.length} linked`}</span>
            </div>
            {projects.length === 0 && !relationshipLoading ? (
              <p className="px-3 py-5 text-sm text-neutral-500">No projects are linked to this client.</p>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {projects.map((project) => (
                  <Link key={project.id} to={`/projects?id=${encodeURIComponent(project.id)}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#173244]/30 dark:hover:bg-neutral-800">
                    <span className="font-semibold">{project.fullName}</span>
                    <RecordStatus value={project.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </div>
  );
}

function clientProperties(client: Client) {
  return [
    { label: "QBO ID", value: client.id },
    { label: "Name", value: client.displayName || client.fullyQualifiedName },
    { label: "Full name", value: client.fullyQualifiedName },
    { label: "Billing address", value: formatAddress(client.billingAddress) },
    { label: "Shipping address", value: formatAddress(client.shippingAddress) },
    { label: "QBO active", value: client.active ? "Yes" : "No" },
    { label: "Last synced", value: client.lastSyncedDate },
  ];
}

function formatAddress(address: Client["billingAddress"]) {
  return [address.line1, address.line2, [address.city, address.state].filter(Boolean).join(", "), address.zip]
    .filter(Boolean)
    .join(" · ");
}

function ContactList({
  contacts,
  loading,
  draft,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
  saving,
}: {
  contacts: Contact[];
  loading: boolean;
  draft: Contact | null;
  onEdit: (contact: Contact) => void;
  onDraftChange: (contact: Contact) => void;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <section className="rounded border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700"><h2 className="text-sm font-semibold">Contacts</h2><span className="text-xs text-neutral-500">{loading ? "Loading..." : `${contacts.length} total`}</span></div>
      {draft && <ContactForm contact={draft} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} saving={saving} />}
      {!loading && contacts.length === 0 && !draft && <p className="px-3 py-5 text-sm text-neutral-500">No contacts yet. Add a contact to make invoice and project assignments easier.</p>}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
        {contacts.map((contact) => (
          <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
            <div>
              <p className="font-semibold">{contact.name}{contact.title && <span className="ml-2 font-normal text-neutral-500">{contact.title}</span>}</p>
              <p className="text-neutral-600 dark:text-neutral-300">{contact.email}{contact.phone ? ` · ${contact.phone}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[0.68rem] uppercase tracking-wide"><Badge active={contact.pointOfContact}>Point of contact</Badge><Badge active={contact.receiveInvoices}>Invoices</Badge><Badge active={contact.active}>Active</Badge></div>
            </div>
            <button type="button" onClick={() => onEdit(contact)} className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800">Edit</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactForm({ contact, onChange, onSave, onCancel, saving }: { contact: Contact; onChange: (contact: Contact) => void; onSave: (contact: Contact) => void; onCancel: () => void; saving: boolean }) {
  const inputClass = "rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800";
  const update = (changes: Partial<Contact>) => onChange({ ...contact, ...changes });
  return (
    <div className="grid gap-3 border-b border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold">Name<input autoFocus className={inputClass} value={contact.name} onChange={(event) => update({ name: event.target.value })} /></label>
        <label className="grid gap-1 text-xs font-semibold">Email<input className={inputClass} type="email" value={contact.email} onChange={(event) => update({ email: event.target.value })} /></label>
        <label className="grid gap-1 text-xs font-semibold">Phone <span className="font-normal text-neutral-500">(optional)</span><input className={inputClass} value={contact.phone ?? ""} onChange={(event) => update({ phone: event.target.value ? Number(event.target.value) : undefined })} /></label>
        <label className="grid gap-1 text-xs font-semibold">Title <span className="font-normal text-neutral-500">(optional)</span><input className={inputClass} value={contact.title || ""} onChange={(event) => update({ title: event.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm"><Check label="Point of contact" checked={contact.pointOfContact} onChange={(value) => update({ pointOfContact: value })} /><Check label="Receive invoices" checked={contact.receiveInvoices} onChange={(value) => update({ receiveInvoices: value })} /><Check label="Active" checked={contact.active} onChange={(value) => update({ active: value })} /></div>
      <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => onSave(contact)} className="rounded bg-[#173244] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save contact"}</button><button type="button" disabled={saving} onClick={onCancel} className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600">Cancel</button></div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="inline-flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`rounded px-1.5 py-0.5 ${active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>{children}</span>;
}
