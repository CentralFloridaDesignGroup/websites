import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dropdown } from '../core/dropdown';
import type { DropdownProperties } from '../core/dropdown';
import { classValueToString, getRequiredMessage, isRequired } from 'cfdg/scripts';

/** Properties for the Northstar-styled Dropdown. */
export type NorthstarDropdownProperties = DropdownProperties & {
    /** Visible field label. */
    label?: string;
    /** Description displayed below the label. */
    description?: string;
    /** Generic validation message. */
    errorMessage?: string;
};

/** Dropdown styled for the Northstar application. */
export function NorthstarDropdown(props: NorthstarDropdownProperties) {
    const [error, setError] = useState<string | null>(null);
    const { label, description, errorMessage, className, required, colorMode = 'auto', onChange, onBlur, ...rest } = props;
    const customLightClasses = typeof className === 'string' ? className : classValueToString(className?.light);
    const customDarkClasses = typeof className === 'string' ? className : classValueToString(className?.dark);

    function validate(value: string) {
        const nextError = isRequired(required) && !value ? getRequiredMessage(required) ?? errorMessage ?? 'This field is required.' : null;
        setError(nextError);
    }

    return <div className="flex w-full flex-col gap-1">
        {label && <label htmlFor={rest.field} className="block text-start text-sm/6 font-medium text-gray-900 dark:text-gray-100">{label}{isRequired(required) && <span className="ml-0.5 text-red-500">*</span>}</label>}
        {description && <p className="text-start text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        <Dropdown {...rest} required={required} colorMode={colorMode} className={{ light: `block w-full border bg-transparent text-gray-900 focus:outline-2 ${error ? 'border-red-500 focus:outline-red-500' : 'focus:outline-primary'} ${customLightClasses}`, dark: `block w-full border bg-transparent text-gray-100 focus:outline-2 ${customDarkClasses}` }} onChange={(event: ChangeEvent<HTMLInputElement>) => { validate(event.target.value); onChange?.(event); }} onBlur={(event) => { validate(event.target.value); onBlur?.(event); }} />
        {error && <p className="mt-0.5 text-start text-sm text-red-600 dark:text-red-400"><span className="font-medium">Error: </span>{error}</p>}
    </div>;
}
