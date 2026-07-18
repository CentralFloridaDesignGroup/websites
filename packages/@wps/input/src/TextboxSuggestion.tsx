import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { controlClass, errorClass, fieldShellClass, labelClass, menuClass, optionClass, type InputColorMode, type LabelPosition } from "./styles";

type RequiredRule = boolean | { isRequired?: boolean; errorMessage?: string };

type Suggestion = Record<string, unknown> | { key: string; value: string };

/**
 * Props for the shared dense textbox with suggestions.
 */
export interface TextboxSuggestionProperties {
    /** Field name used for ids, names, and validation callbacks. */
    field: string;
    /** Suggestion records. The value field, or first value, is used for display. */
    suggestions: Suggestion[];
    /** Visible label text. When omitted, a screen-reader label is still rendered. */
    label?: string;
    /** Label placement relative to the input. Defaults to "top". */
    labelPosition?: LabelPosition;
    /** Input type. */
    type?: "text" | "password" | "email" | "number" | "date" | "tel";
    /** Legacy read-only alias. Prefer readOnly. */
    readonly?: boolean;
    /** Standard read-only state. */
    readOnly?: boolean;
    /** Placeholder text. */
    placeholder?: string;
    /** Uncontrolled initial value. */
    defaultValue?: string;
    /** Controlled input value. */
    value?: string;
    /** Required validation rule. */
    required?: RequiredRule;
    /** Regex validation rule and optional error text. */
    regexFormat?: { format: RegExp; errorMessage?: string };
    /** Disables the control. */
    disabled?: boolean;
    /** Legacy autocomplete alias. */
    autocompleteField?: string;
    /** Target color mode for the control. Defaults to "light". */
    colorMode?: InputColorMode;
    /** Called for every value change. */
    onChange?: (field: string, value: string) => void;
    /** Called when the current value passes validation. */
    onValidChange?: (field: string, value: string) => void;
    /** Called whenever validation is evaluated. */
    onValidReport?: (field: string, isValid: boolean) => void;
}

function getDisplayValue(suggestion: Suggestion): string {
    if ("value" in suggestion && suggestion.value !== undefined) return String(suggestion.value);
    const firstValue = Object.values(suggestion)[0];
    return firstValue === undefined || firstValue === null ? "" : String(firstValue);
}

function isRequired(required: RequiredRule | undefined): boolean {
    if (typeof required === "boolean") return required;
    return Boolean(required?.isRequired ?? required);
}

function requiredMessage(required: RequiredRule | undefined): string {
    return typeof required === "object" && required?.errorMessage ? required.errorMessage : "This field is required";
}

/**
 * Dense industrial textbox that filters and selects suggested values.
 */
export function TextboxSuggestion({
    field,
    suggestions,
    label,
    labelPosition = "top",
    type = "text",
    readonly,
    readOnly,
    placeholder = "",
    defaultValue,
    value,
    required,
    regexFormat,
    disabled,
    autocompleteField,
    colorMode = "light",
    onChange,
    onValidChange,
    onValidReport
}: TextboxSuggestionProperties): React.JSX.Element {
    const [error, setError] = useState<string | null>(null);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const [query, setQuery] = useState(defaultValue ?? "");
    const didMount = useRef(false);
    const selectedValue = value ?? internalValue;

    const filteredSuggestions = useMemo(() => {
        const normalizedQuery = query.toLowerCase();
        return normalizedQuery === ""
            ? suggestions
            : suggestions.filter((suggestion) => getDisplayValue(suggestion).toLowerCase().includes(normalizedQuery));
    }, [suggestions, query]);

    const validateInput = (nextValue: string): boolean => {
        if (isRequired(required) && !nextValue) {
            setError(requiredMessage(required));
            onValidReport?.(field, false);
            return false;
        }
        if (regexFormat && nextValue && !regexFormat.format.test(nextValue)) {
            setError(regexFormat.errorMessage || "Invalid input");
            onValidReport?.(field, false);
            return false;
        }
        setError(null);
        onValidReport?.(field, true);
        return true;
    };

    const handleValueChange = (nextValue: string | null) => {
        const resolvedValue = nextValue ?? "";
        if (value === undefined) setInternalValue(resolvedValue);
        setQuery(resolvedValue);
        onChange?.(field, resolvedValue);
        if (validateInput(resolvedValue)) onValidChange?.(field, resolvedValue);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleValueChange(event.target.value);
    };

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            if (defaultValue) {
                if (validateInput(defaultValue)) onValidChange?.(field, defaultValue);
            }
            return;
        }
        if (value === undefined) {
            setInternalValue(defaultValue ?? "");
            setQuery(defaultValue ?? "");
        }
    }, [defaultValue, value]);

    return (
        <div>
            <Combobox as="div" value={selectedValue} onChange={handleValueChange} disabled={disabled}>
                <div className={fieldShellClass(labelPosition)}>
                    <label
                        htmlFor={field}
                        className={labelClass({ colorMode, required: isRequired(required), hidden: !label, labelPosition })}
                    >
                        {label ?? field}
                    </label>
                    <div className={labelPosition === "side" ? "relative flex-1" : "relative"}>
                        <ComboboxInput
                            id={field}
                            name={field}
                            type={type}
                            className={controlClass({ colorMode, invalid: Boolean(error), disabled, className: "pr-8" })}
                            placeholder={placeholder}
                            value={selectedValue}
                            onChange={handleInputChange}
                            onBlur={(event) => validateInput(event.target.value)}
                            readOnly={readOnly || readonly || false}
                            autoComplete={autocompleteField || "off"}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 disabled:hidden" disabled={disabled || readOnly || readonly}>
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </ComboboxButton>
                        <ComboboxOptions transition className={menuClass(colorMode)}>
                            {filteredSuggestions.map((suggestion, index) => {
                                const displayValue = getDisplayValue(suggestion);
                                return (
                                    <ComboboxOption
                                        key={`${displayValue}-${index}`}
                                        value={displayValue}
                                        className={({ focus, selected }) => optionClass({ colorMode, focus, selected })}
                                    >
                                        {displayValue}
                                    </ComboboxOption>
                                );
                            })}
                        </ComboboxOptions>
                    </div>
                </div>
            </Combobox>
            {error ? (
                <p className={errorClass()} id={`${field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    );
}
