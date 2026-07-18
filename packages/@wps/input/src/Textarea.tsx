import { useEffect, useRef, useState } from "react";
import { controlClass, errorClass, fieldShellClass, labelClass, type InputColorMode, type LabelPosition } from "./styles";

type RequiredRule = boolean | { isRequired?: boolean; errorMessage?: string };

/**
 * Props for the shared dense textarea control.
 */
export interface TextareaProperties extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "required"> {
    /** Field name used for ids, names, and validation callbacks. */
    field: string;
    /** Visible label text. When omitted, a screen-reader label is still rendered. */
    label?: string;
    /** Label placement relative to the textarea. Defaults to "top". */
    labelPosition?: LabelPosition;
    /** Required validation rule. */
    required?: RequiredRule;
    /** Regex validation rule and optional error text. */
    regexFormat?: { format: RegExp; errorMessage?: string };
    /** Allows Enter to create new lines. Defaults to true. */
    allowNewlines?: boolean;
    /** Legacy read-only alias. Prefer readOnly. */
    readonly?: boolean;
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
    return typeof required === "object" && required?.errorMessage ? required.errorMessage : "This field is required.";
}

/**
 * Dense industrial multiline text control with consistent validation and color modes.
 */
export function Textarea({
    field,
    label,
    labelPosition = "top",
    required,
    regexFormat,
    allowNewlines = true,
    readonly,
    colorMode = "light",
    onValidChange,
    onValidReport,
    onChange,
    onBlur,
    onKeyDown,
    defaultValue,
    value,
    disabled,
    readOnly,
    className,
    ...textareaProps
}: TextareaProperties): React.JSX.Element {
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
            setError(regexFormat.errorMessage || "Invalid format.");
            onValidReport?.(field, false);
            return false;
        }
        setError(null);
        onValidReport?.(field, true);
        return true;
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextValue = event.target.value;
        if (value === undefined) setInternalValue(nextValue);
        onChange?.(event);
        if (validateInput(nextValue)) onValidChange?.(field, nextValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        validateInput(event.target.value);
        onBlur?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!allowNewlines && event.key === "Enter") event.preventDefault();
        onKeyDown?.(event);
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
                <textarea
                    {...textareaProps}
                    id={field}
                    name={field}
                    value={stringValue}
                    readOnly={readOnly || readonly || false}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={controlClass({ colorMode, invalid: Boolean(error), disabled, className: `min-h-[100px] resize-y border-t pt-2 ${className || ""}` })}
                    disabled={disabled || false}
                />
            </div>
            {error ? (
                <p className={errorClass()} id={`${field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    );
}
