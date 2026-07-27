import { type ClientContact, type QboCustomer } from 'cfdg/types'
import { type ClientForm, type ContactForm } from './types'

export const emptyContact: ContactForm = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: '',
  isInvoiceRecipient: true,
  active: true,
  notes: '',
}

export const emptyClient: ClientForm = {
  name: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: 'FL',
    postalCode: '',
  },
  phone: '',
  email: '',
}

export function contactToForm(contact: ClientContact): ContactForm {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    isInvoiceRecipient: contact.isInvoiceRecipient,
    active: contact.active,
    notes: contact.notes,
  }
}

export function formatClientAddress(client: QboCustomer): string {
  return [client.billAddrLine1, client.billAddrCity, client.billAddrState, client.billAddrPostalCode].filter(Boolean).join(', ')
}

