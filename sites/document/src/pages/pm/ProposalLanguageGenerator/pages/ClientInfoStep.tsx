import { useEffect, useState } from 'react'
import { Button, Combobox, Textbox } from 'cfdg/input'
import { Modal, showNotification } from 'cfdg/layout'
import type { ClientContact, QboCustomer, State } from 'cfdg/types'
import { Plus } from 'lucide-react'
import { createClient, createClientContact, fetchClientContacts, fetchClients, type ContactPayload } from '../../../../api/projectManagement'
import type { ClientInfo } from '../types/proposalTypes'
import { EMPTY_CLIENT } from '../types/emptyClientInfo'

type Props = { initialValues?: Partial<ClientInfo>; onNext: (info: ClientInfo, clientId: string, contactId: string) => void }
type ClientForm = { name: string; address: { line1: string; line2: string; city: string; state: string; postalCode: string }; phone: string; email: string; individual: boolean }
type ContactForm = { name: string; email: string; phone: string; role: string }
const emptyClient: ClientForm = { name: '', address: { line1: '', line2: '', city: '', state: 'FL', postalCode: '' }, phone: '', email: '', individual: false }
const emptyContact: ContactForm = { name: '', email: '', phone: '', role: '' }

export function ClientInfoStep({ initialValues, onNext }: Props) {
  const [clients, setClients] = useState<QboCustomer[]>([]); const [contacts, setContacts] = useState<ClientContact[]>([])
  const [clientId, setClientId] = useState(''); const [contactId, setContactId] = useState(''); const [saving, setSaving] = useState(false)
  const [clientOpen, setClientOpen] = useState(false); const [contactOpen, setContactOpen] = useState(false)
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient); const [contactForm, setContactForm] = useState<ContactForm>(emptyContact)
  const loadClients = async () => { try { setClients(await fetchClients('', 'active')) } catch (error) { showNotification({ title: 'Clients Failed To Load', body: String(error), style: 'danger' }) } }
  useEffect(() => { void loadClients() }, [])
  useEffect(() => { if (!clientId) { setContacts([]); return }; void fetchClientContacts(clientId).then(setContacts).catch((error) => showNotification({ title: 'Contacts Failed To Load', body: String(error), style: 'danger' })) }, [clientId])
  const client = clients.find((item) => item.id === clientId); const contact = contacts.find((item) => item.id === contactId)
  async function saveClient() {
    if (!clientForm.name.trim() || !clientForm.address.line1.trim() || !clientForm.address.city.trim() || !clientForm.address.state.trim() || !clientForm.address.postalCode.trim() || (clientForm.individual && !clientForm.email.trim())) return
    setSaving(true); try {
      const saved = await createClient({ name: clientForm.name.trim(), address: { ...clientForm.address, state: clientForm.address.state as State }, phone: clientForm.phone.trim(), email: clientForm.email.trim() })
      await loadClients(); setClientId(saved.id)
      let createdContact: ClientContact | null = null
      if (clientForm.individual) createdContact = await createClientContact(saved.id, { name: saved.displayName, email: clientForm.email.trim(), phone: clientForm.phone.trim(), role: '', isInvoiceRecipient: true, active: true, notes: '' })
      setContactId(createdContact?.id || ''); setClientOpen(false); setClientForm(emptyClient)
    } catch (error) { showNotification({ title: 'Client Create Failed', body: String(error), style: 'danger' }) } finally { setSaving(false) }
  }
  async function saveContact() {
    if (!clientId || !contactForm.name.trim() || !contactForm.email.trim()) return
    setSaving(true); try { const saved = await createClientContact(clientId, { ...contactForm, name: contactForm.name.trim(), email: contactForm.email.trim(), phone: contactForm.phone.trim(), role: contactForm.role.trim(), isInvoiceRecipient: true, active: true, notes: '' } satisfies ContactPayload); setContacts((items) => [...items, saved]); setContactId(saved.id); setContactOpen(false); setContactForm(emptyContact) } catch (error) { showNotification({ title: 'Contact Create Failed', body: String(error), style: 'danger' }) } finally { setSaving(false) }
  }
  function next() {
    if (!client || !contact) return
    onNext({ ...EMPTY_CLIENT, ...initialValues, clientName: client.displayName, clientAddressLine1: client.billAddrLine1, clientAddressLine2: client.billAddrLine2, clientCity: client.billAddrCity, clientState: client.billAddrState, clientZip: client.billAddrPostalCode, contactName: contact.name, email: contact.email, phone: contact.phone }, client.id, contact.id)
  }
  return <div className="p-6 space-y-5"><div><h2 className="text-2xl font-bold">Client & Contact</h2><p className="text-gray-600">Choose the client and primary proposal contact.</p></div>
    <div className="grid gap-4 md:grid-cols-2"><Combobox field="proposal-client" label="Client" colorMode="auto" selections={clients.map((item) => ({ key: item.displayName, value: item.id }))} value={clientId} placeholder="Select client" onChange={(_, value) => { setClientId(value); setContactId('') }} />
      <Combobox field="proposal-contact" label="Primary Contact" colorMode="auto" selections={contacts.map((item) => ({ key: `${item.name} - ${item.email}`, value: item.id }))} value={contactId} disabled={!clientId} placeholder={clientId ? 'Select contact' : 'Select client first'} onChange={(_, value) => setContactId(value)} />
    </div><div className="flex gap-2"><Button label="New Client" style="secondary" icon={Plus} onClick={() => setClientOpen(true)} /><Button label="New Contact" style="secondary" icon={Plus} onClick={() => setContactOpen(true)} properties={{ disabled: !clientId }} /></div>
    <div className="flex justify-end"><Button label="Next: Project Details" style="primary" onClick={next} properties={{ disabled: !client || !contact }} /></div>
    <Modal title="New Client" isOpen={clientOpen} onAccept={() => void saveClient()} onClose={() => !saving && setClientOpen(false)} acceptText={saving ? 'Saving' : 'Create Client'} acceptDisabled={saving} colorMode="auto" size="lg"><div className="grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><Textbox field="proposal-new-client-name" label="Client Name" colorMode="auto" value={clientForm.name} required onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} /></div><label className="md:col-span-2 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={clientForm.individual} onChange={(e) => setClientForm((f) => ({ ...f, individual: e.target.checked }))} />Individual client — also create a matching contact</label>{(['line1', 'line2', 'city', 'state', 'postalCode'] as const).map((field) => <Textbox key={field} field={`proposal-client-${field}`} label={field === 'line1' ? 'Address Line 1' : field === 'line2' ? 'Address Line 2' : field === 'postalCode' ? 'Postal Code' : field[0].toUpperCase() + field.slice(1)} colorMode="auto" value={clientForm.address[field]} required={field !== 'line2'} onChange={(e) => setClientForm((f) => ({ ...f, address: { ...f.address, [field]: e.target.value } }))} />)}<Textbox field="proposal-client-phone" label="Phone" colorMode="auto" value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} /><Textbox field="proposal-client-email" label="Email" type="email" colorMode="auto" required={clientForm.individual} value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} /></div></Modal>
    <Modal title="New Contact" isOpen={contactOpen} onAccept={() => void saveContact()} onClose={() => !saving && setContactOpen(false)} acceptText={saving ? 'Saving' : 'Create Contact'} acceptDisabled={saving || !contactForm.name.trim() || !contactForm.email.trim()} colorMode="auto" size="lg"><div className="space-y-3"><Textbox field="proposal-contact-name" label="Name" colorMode="auto" required value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} /><Textbox field="proposal-contact-email" label="Email" type="email" colorMode="auto" required value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} /><Textbox field="proposal-contact-phone" label="Phone" colorMode="auto" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} /><Textbox field="proposal-contact-role" label="Role / Title" colorMode="auto" value={contactForm.role} onChange={(e) => setContactForm((f) => ({ ...f, role: e.target.value }))} /></div></Modal>
  </div>
}
