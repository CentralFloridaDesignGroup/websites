
import { normalizeScopeOfWorkForWord } from "../utils/scopeOfWorkFormatting";

export interface LanguageEntry {
  type: "paragraph" | "list-numbered" | "list-bulleted";
  content: string | string[];
}

export interface ParamEntry {
  key: string;
  label: string;
  type: "text" | "list" | "multipleChoice";
  textarea?: boolean;
  allowBlank?: boolean;
  regex?: string;
  options?: {
    value: string;
    label: string;
  }[];
  columns?: number;
}

export interface TemplateEntry {
  id: string;
  name: string;
  description: string;
  language: LanguageEntry[];
  formattedLanguage?: LanguageEntry[];
  params?: ParamEntry[];
  notes?: string[];
  tags?: string[];
  defaultCost?: number;
  defaultRetainer?: number;
}

export interface ClientInfo {
  clientName: string;
  contactName: string;
  clientAddressLine1: string;
  clientAddressLine2?: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  phone: string;
  email: string;
  projectNumber: string;
  projectName: string;
  proposalDate: string;
  address: string;
  approxAddress: boolean;
  jurisdiction: string;
  isJurisdictionUnincorporated: boolean;
  county: string;
  state: string;
  zipCode: string;
  parcelIdList: string;
  whitePointSigner: string;
  whitePointTitle: string;
  projectCost: string;
  projectRetainer: string;
}

export type ServicePriceType = "Fixed Fee" | "Fixed Fee + Expenses" | "Time & Materials (T&M)" | "Time & Materials Not to Exceed (NTE)" | "Direct Expense Reimbursement";

export interface ServiceEntry {
  serviceName: string;
  serviceCost: string;
  serviceRetainer: string;
  retainerPercentage: string;
  serviceType: ServicePriceType;
  scopeOfWork: string;
}

export function getCurrentLocalDateInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatProposalDate(dateStr: string): string {
  const trimmedDate = dateStr.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const date = new Date(trimmedDate);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export class Proposal {
  public clientInfo: ClientInfo;

  public services: ServiceEntry[];

  public constructor(clientInfo: ClientInfo, services: ServiceEntry[]) {
    this.clientInfo = clientInfo;
    this.services = services;
  }

  public updateClientInfo(updatedInfo: Partial<ClientInfo>) {
    this.clientInfo = { ...this.clientInfo, ...updatedInfo };
  }

  public getProjectAddress(): string {
    return (
      (this.clientInfo.approxAddress
        ? "Near " + this.clientInfo.address
        : this.clientInfo.address) || ""
    );
  }

  private getJurisdictionLabel(): string {
    if (this.clientInfo.isJurisdictionUnincorporated) {
      return `Unincorporated Areas (${this.clientInfo.jurisdiction})`;
    } else {
      return "City of " + this.clientInfo.jurisdiction;
    }
  }

  public getProjectJurisStZip(): string {
    const { county, state, zipCode } = this.clientInfo;
    return `${this.getJurisdictionLabel()}, ${county + " County,"} ${state} ${zipCode}`;
  }

  public getFormattedParcelIdList(): string {
    const formattedParcelIds = this.clientInfo.parcelIdList
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "");
    if (formattedParcelIds.length > 1) {
      const lastId = formattedParcelIds.pop();
      return `${formattedParcelIds.join(", ")} and ${lastId}`;
    } else {
      return formattedParcelIds.join(", ");
    }
  }

  public getClientAddressLine(): string {
    const { clientAddressLine1, clientAddressLine2 } = this.clientInfo;
    return `${clientAddressLine1}${clientAddressLine2 ? ", " + clientAddressLine2 : ""}`;
  }

  public getClientCityStZip(): string {
    const { clientCity, clientState, clientZip } = this.clientInfo;
    return `${clientCity}, ${clientState} ${clientZip}`;
  }

  public convertPriceTypeToAbbreviation(priceType: ServicePriceType): string {
    switch (priceType) {
      case "Fixed Fee":
        return "FF";
      case "Fixed Fee + Expenses":
        return "FF+E";
      case "Time & Materials (T&M)":
        return "TME";
      case "Time & Materials Not to Exceed (NTE)":
        return "TMNTE";
      case "Direct Expense Reimbursement":
        return "DER";
      default:
        return priceType;
    }
  }

  public generateDocXJson(): any {
    const formattedServices = this.services.map((service, index) => ({
      ...service,
      hasSubtasks: false,
      scopeOfWork: normalizeScopeOfWorkForWord(service.scopeOfWork),
      scopeOfWorkRichXml: normalizeScopeOfWorkForWord(service.scopeOfWork),
      type: this.convertPriceTypeToAbbreviation(service.serviceType),
      index: (index + 1).toString().padStart(2, '0'),
      serviceCost: this.formattedCost(service.serviceCost),
      serviceRetainer: this.formattedCost(service.serviceRetainer),
    }));

    return {
      ...this.clientInfo,
      projectCost: this.formattedCost(this.clientInfo.projectCost),
      projectRetainer: this.formattedCost(this.clientInfo.projectRetainer),
      proposalDate: formatProposalDate(this.clientInfo.proposalDate),
      clientAddress: this.getClientAddressLine(),
      clientAddressCityStZip: this.getClientCityStZip(),
      projectAddress: this.getProjectAddress(),
      projectJurisStZip: this.getProjectJurisStZip(),
      parcelIdList: this.getFormattedParcelIdList(),
      services: formattedServices,
      servicesWithSubtasks: [],
      servicesWithoutSubtasks: formattedServices,
    };
  }

  private formattedCost(cost: string): string {
        const num = parseFloat(cost);
        if (isNaN(num)) return cost;
        return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };
}
