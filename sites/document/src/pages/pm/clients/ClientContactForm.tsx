import { Textarea, Textbox } from 'cfdg/input'
import { type ContactForm } from './types'

type ClientContactFormProps = {
  contactForm: ContactForm
  editorName: string
  onUpdateField: (field: keyof ContactForm, value: string | boolean) => void
}

export function ClientContactForm({ contactForm, editorName, onUpdateField }: ClientContactFormProps) {
  return (
    <div className="space-y-3">
      <Textbox field="contact-name" label="Name" colorMode="auto" value={contactForm.name} onChange={(event) => onUpdateField('name', event.target.value)} required />
      <Textbox field="contact-email" label="Email" colorMode="auto" type="email" value={contactForm.email} onChange={(event) => onUpdateField('email', event.target.value)} required />
      <Textbox field="contact-phone" label="Phone" colorMode="auto" value={contactForm.phone} onChange={(event) => onUpdateField('phone', event.target.value)} />
      <Textbox field="contact-role" label="Role / Title" colorMode="auto" value={contactForm.role} onChange={(event) => onUpdateField('role', event.target.value)} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={contactForm.isInvoiceRecipient} onChange={(event) => onUpdateField('isInvoiceRecipient', event.target.checked)} />
        Invoice recipient
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={contactForm.active} onChange={(event) => onUpdateField('active', event.target.checked)} />
        Active
      </label>
      <Textarea field="contact-notes" label="Notes" colorMode="auto" value={contactForm.notes} onChange={(event) => onUpdateField('notes', event.target.value)} />
      <p className="text-xs text-gray-500 dark:text-gray-400">Saved by {editorName}</p>
    </div>
  )
}
