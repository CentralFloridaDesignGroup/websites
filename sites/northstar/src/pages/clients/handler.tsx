import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  Client,
  ClientListItem,
  Contact,
  ListOptions,
  PageSize,
  Pagination,
  ProjectListItem,
} from "cfdg/types/v2";
import {
  createClientContact,
  fetchClient,
  fetchClientContacts,
  fetchClientProjects,
  fetchClients,
  updateClientContact,
} from "../../api/clients";
import { NorthstarApiError } from "../../api/client";
import { ClientDetailView } from "./detail";
import { ClientListView } from "./list";

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: 25,
  totalRecords: 0,
  totalPages: 0,
};

const EMPTY_CLIENT_OPTIONS: ListOptions = {
  page: 1,
  pageSize: 25,
  direction: "asc",
};

function createContactDraft(): Contact {
  return {
    id: 0,
    parentId: "",
    name: "",
    email: "",
    phone: undefined,
    title: "",
    pointOfContact: false,
    receiveInvoices: false,
    active: true,
    created: "",
    updated: "",
  };
}

/** Coordinates the client list and detail sheets through the URL query state. */
export function ClientsHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id")?.trim() || "";

  useEffect(() => {
    document.title = id ? "Client Detail - Northstar" : "Clients - Northstar";
  }, [id]);

 

  if (id) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold">Client ID:</span> {id}
        </p>
      </div>
    );
  }

  return (
    <ClientListView />
  );
}

