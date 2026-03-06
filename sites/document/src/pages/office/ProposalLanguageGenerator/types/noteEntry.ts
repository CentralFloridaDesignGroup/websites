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