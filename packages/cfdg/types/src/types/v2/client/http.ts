import { Pagination } from "../pagination";
import { ProjectListItem } from "../project/types";
import { Client, ClientListItem, Contact } from "./types";

export type ClientListResponse = {
    clients: ClientListItem[];
    pagination: Pagination;
}

export type ClientResponse = {
    client: Client;
}

export type ClientProjectListResponse = {
    projects: ProjectListItem[];
    pagination: Pagination;
};

export type ClientContactsListResponse = {
    contacts: Contact[];
};

export type ClientContactRequest = {
    contact: Contact;
}

export type ClientContactResponse = {
    contact: Contact;
}