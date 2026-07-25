import { type ClientCreatePayload } from '../../../api/projectManagement'
import { type ContactPayload } from '../../../api/projectManagement'

export type ContactForm = ContactPayload & {
  id: string
}

export type ClientForm = ClientCreatePayload

