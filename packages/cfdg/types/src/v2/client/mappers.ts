import { Address, UnknownPartial } from "../common";
import { Client, ClientDbRow, ClientListItem, ClientListItemDbRow, Contact, ContactDbRow } from "./types";
import { normalizeAddress, normalizeNumber, normalizeString } from "../helpers";

/**
 * Maps a database row representing a client {@link ContactDbRow} to a {@link Contact} object.
 * @param contact The {@link ContactDbRow} to map.
 * @returns The mapped {@link Contact} object.
 */
export function mapContactDbToObject(contact: UnknownPartial<ContactDbRow>): Contact {
    return {
        id: normalizeNumber(contact.id),
        parentId: normalizeString(contact.qbo_id),
        name: normalizeString(contact.name),
        email: normalizeString(contact.email),
        phone: normalizeNumber(contact.phone),
        title: normalizeString(contact.title),
        pointOfContact: Boolean(contact.point_of_contact),
        receiveInvoices: Boolean(contact.receive_invoices),
        active: Boolean(contact.active),
        created: normalizeString(contact.created_date),
        updated: normalizeString(contact.updated_date),
    }
}

/**
 * Maps a {@link Contact} object to a database row representing a client {@link ContactDbRow}.
 * @param contact The {@link Contact} object to map.
 * @returns The mapped {@link ContactDbRow} object.
 */
export function mapContactObjectToDb(contact: UnknownPartial<Contact>): ContactDbRow {
    return {
        id: normalizeNumber(contact.id),
        qbo_id: normalizeString(contact.parentId),
        name: normalizeString(contact.name),
        email: normalizeString(contact.email),
        phone: normalizeNumber(contact.phone),
        title: normalizeString(contact.title),
        point_of_contact: contact.pointOfContact ? 1 : 0,
        receive_invoices: contact.receiveInvoices ? 1 : 0,
        active: contact.active ? 1 : 0,
        created_date: normalizeString(contact.created),
        updated_date: normalizeString(contact.updated),
    }
}

/**
 * Maps a {@link ClientDbRow} object to a {@link Client} object.
 * @param client The {@link ClientDbRow} object to map.
 * @returns The mapped {@link Client} object.
 */
export function mapClientDbToObject(client: UnknownPartial<ClientDbRow>): Client {
    const billingAddress = normalizeAddress(
        client.bill_addr_line1,
        client.bill_addr_line2,
        client.bill_addr_city,
        client.bill_addr_state,
        client.bill_addr_postal_code
    );

    const shippingAddress = normalizeAddress(
        client.ship_addr_line1,
        client.ship_addr_line2,
        client.ship_addr_city,
        client.ship_addr_state,
        client.ship_addr_postal_code
    );

    return {
        id: normalizeString(client.qbo_id),
        parentId: normalizeString(client.parent_id),
        displayName: normalizeString(client.display_name),
        fullyQualifiedName: normalizeString(client.fully_qualified_name),
        billingAddress: billingAddress || {} as Address,
        shippingAddress: shippingAddress || {} as Address,
        active: Boolean(client.active),
        syncToken: normalizeString(client.sync_token),
        qboUpdatedTime: normalizeString(client.qbo_updated_time),
        lastSyncedDate: normalizeString(client.last_synced_date),
        status: normalizeString(client.extra_status) as Client["status"],
        contacts: [],
        files: [],
    }
}

/**
 * Maps a {@link Client} object to a {@link ClientDbRow} object.
 * @param client The {@link Client} object to map.
 * @returns The mapped {@link ClientDbRow} object.
 */
export function mapClientObjectToDb(client: Client): ClientDbRow {
    const billingAddress = client.billingAddress || {} as Address;
    const shippingAddress = client.shippingAddress || {} as Address;
    return {
        qbo_id: normalizeString(client.id),
        parent_id: normalizeString(client.parentId),
        display_name: normalizeString(client.displayName),
        fully_qualified_name: normalizeString(client.fullyQualifiedName),
        bill_addr_line1: normalizeString(billingAddress.line1),
        bill_addr_line2: normalizeString(billingAddress.line2),
        bill_addr_city: normalizeString(billingAddress.city),
        bill_addr_state: normalizeString(billingAddress.state),
        bill_addr_postal_code: normalizeString(billingAddress.zip),
        ship_addr_line1: normalizeString(shippingAddress.line1),
        ship_addr_line2: normalizeString(shippingAddress.line2),
        ship_addr_city: normalizeString(shippingAddress.city),
        ship_addr_state: normalizeString(shippingAddress.state),
        ship_addr_postal_code: normalizeString(shippingAddress.zip),
        active: client.active ? 1 : 0,
        sync_token: normalizeString(client.syncToken),
        qbo_updated_time: normalizeString(client.qboUpdatedTime),
        last_synced_date: normalizeString(client.lastSyncedDate),
        extra_status: normalizeString(client.status),
    };
}

export function mapClientListItemDbToObject(client: UnknownPartial<ClientListItemDbRow>): ClientListItem {
    return {
        id: normalizeString(client.id),
        fullName: normalizeString(client.fullName),
        status: normalizeString(client.extra_status) as ClientListItem["status"],
    }
}
