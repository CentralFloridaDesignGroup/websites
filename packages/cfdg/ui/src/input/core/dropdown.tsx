import { useMemo, useState } from 'react';
import type { ChangeEvent, FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { Combobox as HeadlessCombobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { compileClasses, isRequired } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode, InputSize, RequiredProperty } from 'cfdg/types/v2';

/** A visible label and stored value for a Dropdown option. */
export type DropdownOption = { label: string; value: string };

/** Properties for the shared Dropdown control. */
export type DropdownProperties = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'defaultValue' | 'id' | 'name' | 'onChange' | 'onBlur' | 'required' | 'size' | 'value'> & {
    /** The name of the field. Should be unique. */
    field: string;
    /** The options shown by the dropdown. */
    options: DropdownOption[];
    /** Whether the visible control can be searched. Defaults to false. */
    searchable?: boolean;
    /** Whether a value not present in options can be stored. Requires searchable. */
    allowCustomValue?: boolean;
    /** Whether the field may be left empty. A true value means the field is required. */
    required?: RequiredProperty;
    /** CSS classes for the input element. */
    className?: string | ColorClassNamesFor<ColorMode>;
    /** The size of the control. Defaults to medium. */
    size?: InputSize;
    /** The color mode of the control. Defaults to auto. */
    colorMode?: ColorMode;
    /** The selected value for a controlled dropdown. */
    value?: string;
    /** The initial selected value for an uncontrolled dropdown. */
    defaultValue?: string;
    /** Called when the selected value changes. The stored value is available at event.target.value. */
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    /** Called when the control loses focus. */
    onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
};

function optionClasses(colorMode: ColorMode, focused: boolean, selected: boolean): string {
    const light = `cursor-pointer px-3 py-2 text-sm ${focused ? 'bg-primary text-white' : 'text-gray-900'} ${selected ? 'font-semibold' : ''}`;
    const dark = `cursor-pointer px-3 py-2 text-sm ${focused ? 'bg-primary-700 text-white' : 'text-gray-100'} ${selected ? 'font-semibold' : ''}`;
    return compileClasses(colorMode, { light, dark });
}

/** Shared Headless UI dropdown control used by the styled wrappers. */
export function Dropdown(props: DropdownProperties) {
    const {
        field,
        options,
        searchable = false,
        allowCustomValue = false,
        required,
        className = '',
        size = 'medium',
        colorMode = 'auto',
        value,
        defaultValue = '',
        placeholder = 'Select...',
        disabled,
        onChange,
        onBlur,
        ...rest
    } = props;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [query, setQuery] = useState('');
    const selectedValue = value ?? internalValue;
    const selectedOption = options.find((option) => option.value === selectedValue);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredOptions = useMemo(() => {
        const matches = !searchable || !normalizedQuery
            ? options
            : options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery) || option.value.toLocaleLowerCase().includes(normalizedQuery));
        if (searchable && allowCustomValue && query.trim() && !options.some((option) => option.value === query.trim())) {
            return [...matches, { label: query.trim(), value: query.trim() }];
        }
        return matches;
    }, [allowCustomValue, normalizedQuery, options, query, searchable]);

    const sizeClasses: Record<InputSize, string> = {
        small: 'px-2 py-1 text-sm', medium: 'px-3 py-2 text-base', large: 'px-4 py-3 text-lg',
    };
    const inputClasses = compileClasses(colorMode, typeof className === 'string' ? {
        light: `${sizeClasses[size]} ${className}`,
        dark: `${sizeClasses[size]} ${className}`,
    } : {
        light: `${sizeClasses[size]} ${className.light ?? ''}`,
        dark: `${sizeClasses[size]} ${className.dark ?? ''}`,
    });
    const menuClasses = compileClasses(colorMode, {
        light: 'absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-gray-300 bg-white py-1 shadow-lg focus:outline-none',
        dark: 'absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-gray-600 bg-gray-800 py-1 shadow-lg focus:outline-none',
    });

    function commit(nextValue: string) {
        if (value === undefined) setInternalValue(nextValue);
        setQuery('');
        const event = new Event('change', { bubbles: true }) as unknown as ChangeEvent<HTMLInputElement>;
        Object.defineProperty(event, 'target', { value: { name: field, value: nextValue } });
        onChange?.(event);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' && allowCustomValue && searchable && query.trim() && !options.some((option) => option.value === query.trim())) {
            event.preventDefault();
            commit(query.trim());
        }
    }

    return (
        <HeadlessCombobox as="div" value={selectedValue} onChange={(nextValue: string | null) => commit(nextValue ?? '')} onClose={() => setQuery('')} disabled={disabled}>
            <div className="relative">
                <ComboboxInput
                    {...rest}
                    id={field}
                    name={field}
                    className={inputClasses}
                    required={isRequired(required)}
                    placeholder={placeholder}
                    displayValue={() => selectedOption?.label ?? selectedValue}
                    onChange={(event) => setQuery(event.target.value)}
                    readOnly={!searchable}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlur}
                    autoComplete="off"
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2" aria-label="Show options">
                    <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </ComboboxButton>
                <ComboboxOptions className={menuClasses}>
                    {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
                        <ComboboxOption key={`${option.value}-${index}`} value={option.value} className={({ focus, selected }) => optionClasses(colorMode, focus, selected)}>
                            {option.label}
                        </ComboboxOption>
                    )) : <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches found.</div>}
                </ComboboxOptions>
            </div>
        </HeadlessCombobox>
    );
}
