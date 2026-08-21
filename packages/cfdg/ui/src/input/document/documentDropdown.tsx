import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dropdown } from '../core/dropdown';
import type { DropdownProperties } from '../core/dropdown';
import { getRequiredMessage, isRequired } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode } from 'cfdg/types/v2';

/** Properties for the document-styled Dropdown. */
export type DocumentDropdownProperties = DropdownProperties & {
    /** Visible field label. */
    label?: string;
    /** Description displayed below the label. */
    description?: string;
    /** Generic validation message. */
    errorMessage?: string;
};

/** Dropdown styled for document and operations forms. */
export function DocumentDropdown(props: DocumentDropdownProperties) {
    const [error, setError] = useState<string | null>(null);
    const { label, description, errorMessage, className, required, colorMode = 'auto', onChange, onBlur, ...rest } = props;

    function validate(value: string) {
        const nextError = isRequired(required) && !value ? getRequiredMessage(required) ?? errorMessage ?? 'This field is required.' : null;
        setError(nextError);
        return nextError === null;
    }

    return <div className="flex w-full flex-col gap-1">
        {label && <label htmlFor={rest.field} className="block text-start text-sm/6 font-medium text-gray-900 dark:text-gray-100">{label}{isRequired(required) && <span className="ml-0.5 text-red-500">*</span>}</label>}
        {description && <p className="text-start text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        <Dropdown {...rest} required={required} colorMode={colorMode} className={typeof className === 'string' ? {
            light: `block w-full border-b border-gray-300 bg-transparent text-gray-900 focus:border-primary focus:outline-none ${className}`,
            dark: `block w-full border-b border-gray-600 bg-transparent text-gray-100 focus:border-primary-400 focus:outline-none ${className}`,
        } satisfies ColorClassNamesFor<ColorMode> : className} onChange={(event: ChangeEvent<HTMLInputElement>) => { validate(event.target.value); onChange?.(event); }} onBlur={(event) => { validate(event.target.value); onBlur?.(event); }} />
        {error && <p className="mt-0.5 text-start text-sm text-red-600 dark:text-red-400"><span className="font-medium">Error: </span>{error}</p>}
    </div>;
}
