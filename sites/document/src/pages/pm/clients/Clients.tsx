import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { useSearchParams } from 'react-router-dom'
import { Button, Textbox } from 'cfdg/input'
import { Modal, showNotification } from 'cfdg/layout'
import { type ClientContact, type Invoice, type QboCustomer } from 'cfdg/types'
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { fetchInvoices } from '../../../api/invoices'
import {
  createClient,
  createClientContact,
  deleteClientContact,
  fetchClientDetails,
  fetchClients,
  fetchProjects,
  updateClient,
  updateClientStatus,
  updateClientContact,
  type ContactPayload,
  type ProjectSummary,
} from '../../../api/projectManagement'
import { ClientDetailPane } from './ClientDetailPane'
import { ClientContactForm } from './ClientContactForm'
import { ClientList } from './ClientList'
import { contactToForm, emptyClient, emptyContact } from './clientForms'
import { type ClientForm, type ContactForm } from './types'

export function ClientsManager() {
  const { accounts } = useMsal()
  const [searchParams, setSearchParams] = useSearchParams()
  const editorName = accounts[0]?.name ?? accounts[0]?.username ?? 'unknown-user'
  const [clients, setClients] = useState<QboCustomer[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [relatedProjects, setRelatedProjects] = useState<ProjectSummary[]>([])
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [mode, setMode] = useState<'overview' | 'detail'>(() => searchParams.get('clientId') ? 'detail' : 'overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [loading, setLoading] = useState(false)
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContact)
  const [contactFormVisible, setContactFormVisible] = useState(false)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [editingClientId, setEditingClientId] = useState('')
  const [clientSaving, setClientSaving] = useState(false)
  const [clientStatus, setClientStatus] = useState<'active' | 'inactive'>('active')
  const [clientStatusSaving, setClientStatusSaving] = useState(false)
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient)

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId) ?? null, [clients, selectedClientId])
  const canSaveClient = Boolean(clientForm.name.trim() && clientForm.address.line1.trim() && clientForm.address.city.trim() && clientForm.address.state.trim() && clientForm.address.postalCode.trim())

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchClients(searchTerm, statusFilter)
      setClients(data)
      const clientIdParam = searchParams.get('clientId') || ''
      setSelectedClientId((previous) => previous || clientIdParam)
    } catch (error) {
      showNotification({ title: 'Clients Failed To Load', body: String(error), style: 'danger' })
    } finally {
      setLoading(false)
    }
  }, [searchParams, searchTerm, statusFilter])

  const loadContacts = useCallback(async () => {
    if (!selectedClientId) {
      setContacts([])
      return
    }
    try {
      const data = await fetchClientDetails(selectedClientId)
      setContacts(data.contacts)
      setClients((previous) => [data.client, ...previous.filter((client) => client.id !== data.client.id)].sort((a, b) => a.displayName.localeCompare(b.displayName)))
    } catch (error) {
      showNotification({ title: 'Contacts Failed To Load', body: String(error), style: 'danger' })
    }
  }, [selectedClientId])

  const loadRelatedRecords = useCallback(async () => {
    if (!selectedClientId) {
      setRelatedProjects([])
      setRelatedInvoices([])
      return
    }
    setRelatedLoading(true)
    try {
      const [projects, invoices] = await Promise.all([
        fetchProjects({ parentCustomerId: selectedClientId, status: 'all' }),
        fetchInvoices({ qboCustomerId: selectedClientId }),
      ])
      setRelatedProjects(projects)
      setRelatedInvoices(invoices)
    } catch (error) {
      showNotification({ title: 'Related Client Records Failed To Load', body: String(error), style: 'warning' })
    } finally {
      setRelatedLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    document.title = 'Clients - The Compass'
  }, [])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  useEffect(() => {
    void loadContacts()
    setContactForm(emptyContact)
    setContactFormVisible(false)
  }, [loadContacts])

  useEffect(() => {
    void loadRelatedRecords()
  }, [loadRelatedRecords])

  useEffect(() => {
    const clientIdParam = searchParams.get('clientId') || ''
    if (clientIdParam && clientIdParam !== selectedClientId) {
      setSelectedClientId(clientIdParam)
      setMode('detail')
    }
  }, [searchParams, selectedClientId])

  useEffect(() => {
    if (selectedClient) setClientStatus(selectedClient.active ? 'active' : 'inactive')
  }, [selectedClient])

  function selectClient(clientId: string) {
    setSelectedClientId(clientId)
    setContactForm(emptyContact)
    setContactFormVisible(false)
    setMode('detail')
    setSearchParams(clientId ? { clientId } : {}, { replace: false })
  }

  function returnToOverview() {
    setMode('overview')
    setSearchParams({}, { replace: false })
  }

  function updateContactField(field: keyof ContactForm, value: string | boolean) {
    setContactForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateClientField(field: keyof Omit<ClientForm, 'address'>, value: string) {
    setClientForm((previous) => ({ ...previous, [field]: value }))
  }

  function updateClientAddressField(field: keyof ClientForm['address'], value: string) {
    setClientForm((previous) => ({
      ...previous,
      address: {
        ...previous.address,
        [field]: value,
      },
    }))
  }

  function openNewClientDialog() {
    setEditingClientId('')
    setClientForm(emptyClient)
    setClientDialogOpen(true)
  }

  function openEditClientDialog() {
    if (!selectedClient) return
    setEditingClientId(selectedClient.id)
    setClientForm({
      name: selectedClient.displayName,
      address: {
        line1: selectedClient.billAddrLine1,
        line2: selectedClient.billAddrLine2,
        city: selectedClient.billAddrCity,
        state: selectedClient.billAddrState as ClientForm['address']['state'],
        postalCode: selectedClient.billAddrPostalCode,
      },
      phone: selectedClient.primaryPhone,
      email: selectedClient.primaryEmail,
    })
    setClientDialogOpen(true)
  }

  async function saveClient() {
    if (!canSaveClient) return
    setClientSaving(true)
    try {
      const payload = {
        name: clientForm.name.trim(),
        address: {
          line1: clientForm.address.line1.trim(),
          line2: clientForm.address.line2.trim(),
          city: clientForm.address.city.trim(),
          state: clientForm.address.state.trim() as ClientForm['address']['state'],
          postalCode: clientForm.address.postalCode.trim(),
        },
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
      }
      const saved = editingClientId ? await updateClient(editingClientId, payload) : await createClient(payload)
      setClients((previous) => [saved, ...previous.filter((client) => client.id !== saved.id)].sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setSelectedClientId(saved.id)
      setMode('detail')
      setSearchParams({ clientId: saved.id }, { replace: false })
      setClientForm(emptyClient)
      setEditingClientId('')
      setClientDialogOpen(false)
      showNotification({ title: editingClientId ? 'Client Updated' : 'Client Created', body: saved.displayName, style: 'success' })
    } catch (error) {
      showNotification({ title: editingClientId ? 'Client Update Failed' : 'Client Create Failed', body: String(error), style: 'danger' })
    } finally {
      setClientSaving(false)
    }
  }

  async function saveClientStatus() {
    if (!selectedClient) return
    setClientStatusSaving(true)
    try {
      const saved = await updateClientStatus(selectedClient.id, clientStatus)
      setClients((previous) => previous.map((client) => client.id === saved.id ? saved : client))
      showNotification({ title: 'Client Status Saved', body: `${saved.displayName} is now ${saved.active ? 'Active' : 'Inactive'}.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Client Status Save Failed', body: String(error), style: 'danger' })
    } finally {
      setClientStatusSaving(false)
    }
  }

  async function saveContact() {
    if (!selectedClientId) return
    setSaving(true)
    try {
      const payload: ContactPayload = {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        role: contactForm.role.trim(),
        isInvoiceRecipient: contactForm.isInvoiceRecipient,
        active: contactForm.active,
        notes: contactForm.notes.trim(),
      }
      const saved = contactForm.id
        ? await updateClientContact(selectedClientId, contactForm.id, payload)
        : await createClientContact(selectedClientId, payload)
      await loadContacts()
      setContactForm(contactToForm(saved))
      setContactFormVisible(false)
      showNotification({ title: 'Contact Saved', body: `${saved.name} is available for invoices.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Contact Save Failed', body: String(error), style: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  async function removeContact(contact: ClientContact) {
    if (!selectedClientId) return
    setSaving(true)
    try {
      await deleteClientContact(selectedClientId, contact.id)
      await loadContacts()
      if (contactForm.id === contact.id) setContactForm(emptyContact)
      if (contactForm.id === contact.id) setContactFormVisible(false)
      showNotification({ title: 'Contact Deactivated', body: contact.name, style: 'success' })
    } catch (error) {
      showNotification({ title: 'Contact Delete Failed', body: String(error), style: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full min-h-0 text-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {mode === 'detail' && <Button label="Back" style="textonly" icon={ArrowLeft} onClick={returnToOverview} colorMode="auto" />}
          <div>
            <h1 className="text-2xl font-bold">{mode === 'detail' && selectedClient ? selectedClient.displayName : 'Clients'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">QuickBooks customers with internal invoice contacts.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button label="Refresh" style="secondary" icon={RefreshCw} onClick={() => void loadClients()} properties={{ disabled: loading }} />
          <Button label="New Client" style="primary" icon={Plus} onClick={openNewClientDialog} properties={{ disabled: clientSaving }} />
          <Button label="New Contact" style="primary" icon={Plus} onClick={() => {
            setContactForm(emptyContact)
            setContactFormVisible(true)
          }} properties={{ disabled: !selectedClient }} />
        </div>
      </div>

      <Modal
        title={editingClientId ? 'Edit Client' : 'New Client'}
        isOpen={clientDialogOpen}
        onAccept={() => void saveClient()}
        onClose={() => {
          if (!clientSaving) setClientDialogOpen(false)
        }}
        acceptText={clientSaving ? 'Saving' : editingClientId ? 'Save Client' : 'Create Client'}
        acceptDisabled={!canSaveClient || clientSaving}
        colorMode="auto"
        size="lg"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Textbox field="new-client-name" label="Client Name" colorMode="auto" value={clientForm.name} onChange={(event) => updateClientField('name', event.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Textbox field="new-client-address-line1" label="Address Line 1" colorMode="auto" value={clientForm.address.line1} onChange={(event) => updateClientAddressField('line1', event.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Textbox field="new-client-address-line2" label="Address Line 2" colorMode="auto" value={clientForm.address.line2} onChange={(event) => updateClientAddressField('line2', event.target.value)} />
          </div>
          <Textbox field="new-client-city" label="City" colorMode="auto" value={clientForm.address.city} onChange={(event) => updateClientAddressField('city', event.target.value)} required />
          <Textbox field="new-client-state" label="State" colorMode="auto" value={clientForm.address.state} onChange={(event) => updateClientAddressField('state', event.target.value)} required />
          <Textbox field="new-client-postal-code" label="Postal Code" colorMode="auto" value={clientForm.address.postalCode} onChange={(event) => updateClientAddressField('postalCode', event.target.value)} required />
          <Textbox field="new-client-phone" label="Phone" colorMode="auto" value={clientForm.phone} onChange={(event) => updateClientField('phone', event.target.value)} />
          <div className="md:col-span-2">
            <Textbox field="new-client-email" label="Email" colorMode="auto" type="email" value={clientForm.email} onChange={(event) => updateClientField('email', event.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal
        title={contactForm.id ? 'Edit Contact' : 'New Contact'}
        isOpen={contactFormVisible}
        onAccept={() => void saveContact()}
        onClose={() => {
          if (!saving) {
            setContactForm(emptyContact)
            setContactFormVisible(false)
          }
        }}
        acceptText={saving ? 'Saving' : 'Save Contact'}
        acceptDisabled={saving || !contactForm.name.trim() || !contactForm.email.trim()}
        colorMode="auto"
        size="lg"
      >
        <ClientContactForm contactForm={contactForm} editorName={editorName} onUpdateField={updateContactField} />
      </Modal>

      {mode === 'overview' ? (
        <ClientList
          clients={clients}
          loading={loading}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          selectedClientId={selectedClientId}
          onSearchTermChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSelectClient={selectClient}
        />
      ) : (
        <ClientDetailPane
          selectedClient={selectedClient}
          contacts={contacts}
          relatedProjects={relatedProjects}
          relatedInvoices={relatedInvoices}
          relatedLoading={relatedLoading}
          saving={saving}
          clientSaving={clientSaving}
          clientStatus={clientStatus}
          clientStatusSaving={clientStatusSaving}
          onEditClient={openEditClientDialog}
          onClientStatusChange={setClientStatus}
          onSaveClientStatus={() => void saveClientStatus()}
          onShowNewContact={() => {
            setContactForm(emptyContact)
            setContactFormVisible(true)
          }}
          onEditContact={(form) => {
            setContactForm(form)
            setContactFormVisible(true)
          }}
          onRemoveContact={(contact) => void removeContact(contact)}
        />
      )}
    </div>
  )
}
