export interface LanguageEntry {
    type: 'paragraph' | 'list-numbered' | 'list-bulleted';
    content: string | string[];
}

export interface ParamEntry {
    key: string;
    label: string;
    type: 'text' | 'list' | 'multipleChoice';
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
}

export interface ClientInfo {
    clientName: string;
    contactName: string;
    clientAddressLine1: string;
    clientAddressCityStZip: string;
    phone: string;
    email: string;
    projectNumber: string;
    projectName: string;
    proposalDate: string;
    projectAddress: string;
    projectJurisStZip: string;
    parcelIdList: string;
    whitePointSigner: string;
    whitePointTitle: string;
    projectCost: string;
    projectRetainer: string;
}