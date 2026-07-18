import { useEffect, useRef, useState } from "react";
import { controlClass, errorClass, fieldShellClass, labelClass, type InputColorMode, type LabelPosition } from "./styles";

type RequiredRule = boolean | { isRequired?: boolean; errorMessage?: string };

/**
 * Props for the shared dense textbox control.
 */
export interface TextboxProperties extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "required"> {
    /** Field name used for ids, names, and validation callbacks. */
    field: string;
    /** Visible label text. When omitted, a screen-reader label is still rendered. */
    label?: string;
    /** Label placement relative to the input. Defaults to "top". */
    labelPosition?: LabelPosition;
    /** Regex validation rule and optional error text. */
    regexFormat?: { format: RegExp; errorMessage?: string };
    /** Required validation rule. */
    required?: RequiredRule;
    /** Whether validation error text should be visible. Defaults to true. */
    showRequiredError?: boolean;
    /** Legacy autocomplete alias. Prefer autoComplete. */
    autocompleteField?: string;
    /** Target color mode for the control. Defaults to "light". */
    colorMode?: InputColorMode;
    /** Called when the current value passes validation. */
    onValidChange?: (field: string, value: string) => void;
    /** Called whenever validation is evaluated. */
    onValidReport?: (field: string, isValid: boolean) => void;
}

function isRequired(required: RequiredRule | undefined): boolean {
    if (typeof required === "boolean") return required;
    return Boolean(required?.isRequired ?? required);
}

function requiredMessage(required: RequiredRule | undefined): string {
    return typeof required === "object" && required?.errorMessage ? required.errorMessage : "This field is required";
}

/**
 * Dense industrial textbox with consistent validation, labels, errors, and color modes.
 */
export function Textbox({
    field,
    label,
    labelPosition = "top",
    regexFormat,
    required,
    showRequiredError = true,
    autocompleteField,
    colorMode = "light",
    onValidChange,
    onValidReport,
    onChange,
    onBlur,
    defaultValue,
    value,
    disabled,
    readOnly,
    className,
    ...inputProps
}: TextboxProperties): React.JSX.Element {
    const [internalValue, setInternalValue] = useState(defaultValue?.toString() ?? "");
    const [error, setError] = useState<string | null>(null);
    const didMount = useRef(false);
    const stringValue = value === undefined ? internalValue : String(value ?? "");

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

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        if (value === undefined) setInternalValue(nextValue);
        onChange?.(event);
        if (validateInput(nextValue)) onValidChange?.(field, nextValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        validateInput(event.target.value);
        onBlur?.(event);
    };

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            if (defaultValue !== undefined && value === undefined) {
                const nextValue = String(defaultValue ?? "");
                setInternalValue(nextValue);
                if (nextValue && validateInput(nextValue)) onValidChange?.(field, nextValue);
            }
            return;
        }
        if (value === undefined) setInternalValue(defaultValue?.toString() ?? "");
    }, [defaultValue, value]);

    return (
        <div>
            <div className={fieldShellClass(labelPosition)}>
                <label
                    htmlFor={field}
                    className={labelClass({ colorMode, required: isRequired(required), hidden: !label, labelPosition })}
                >
                    {label ?? field}
                </label>
                <input
                    {...inputProps}
                    id={field}
                    name={field}
                    type={inputProps.type || "text"}
                    value={stringValue}
                    readOnly={readOnly || false}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete={inputProps.autoComplete || autocompleteField || "off"}
                    className={controlClass({ colorMode, invalid: Boolean(error), disabled, className })}
                    disabled={disabled || false}
                />
            </div>
            {error && showRequiredError ? (
                <p className={errorClass()} id={`${field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    );
}
