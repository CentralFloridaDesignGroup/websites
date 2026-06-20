import { useState, useEffect, useRef } from "react";

/**
 * A customizable textbox component that supports various input types, validation, and error handling.
 * 
 * @param TextboxProperties - An object containing properties to configure the textbox behavior and appearance.
 * @returns A React JSX element representing the textbox component.
 */
interface TextboxProperties extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * The name of the field that this textbox represents. This is used as the key when calling the onValidChange callback to identify which field has changed.
     */
    field: string;
    /**
     * The label text for the textbox. This is displayed above the input field.
     */
    label?: string;
    /**
     * The default value for the textbox. This is used to initialize the input field.
     */
    defaultValue?: string;
    /**
     * The position of the label relative to the input field. If "top", the label is displayed above the input field. If "side", the label is displayed to the left of the input field. The default is "top".
     */
    labelPosition?: "top" | "side";
    /**
     * A regular expression to validate the input value against.
     */
    regexFormat?: {
        /**
         * The regular expression pattern that the input value must match for it to be considered valid. If the value does not match the pattern, a validation error message will be displayed.
         */
        format: RegExp;
        /**
         * An optional custom error message to display when the regex validation fails. If not provided, a default error message will be shown.
         */
        errorMessage?: string;
    };
    required?: boolean & {
        errorMessage?: string;
    };
    showRequiredError?: boolean;
    /**
     * If true, the textbox will be disabled and cannot be interacted with.
     */
    disabled?: boolean;
    /**
     * The name of the field to be used for autocomplete purposes.
     */
    autocompleteField?: string;
    /**
     * A callback function that is called when the input value changes and is valid according to the provided validation rules. It receives the field name and the new value as arguments.
     */
    onValidChange?: (field: string, value: string) => void;
    /**
     * A callback function that is called when the input value changes and its validity is determined. It receives the field name and a boolean indicating whether the value is valid.
     */
    onValidReport?: (field: string, isValid: boolean) => void;
}

/**
 * A customizable textbox component that supports various input types, validation, and error handling.
 * 
 * @param TextboxProperties - An object containing properties to configure the textbox behavior and appearance.
 * @returns A React JSX element representing the textbox component.
 */
export function Textbox(TextboxProperties: TextboxProperties): React.JSX.Element {
    const [intValue, setIntValue] = useState(''); // Internal state to manage the input value and initialize it with the default value if provided.
    const [error, setError] = useState<string | null>(null); // State to hold validation error messages.
    const isInitialMount = useRef(true); // Ref to track if the component is mounting for the first time.

    const showErrorText = TextboxProperties.showRequiredError ?? true; // Determine whether to show error messages based on the provided property.

    /**
     * A function to check the validity of the input value based on the provided validation rules (regex and required). It updates the error state accordingly and returns a boolean indicating whether the input is valid.
     * @param value - The input value to be validated.
     * @returns A boolean indicating whether the input value is valid.
     */
    const validateInput = (value: string) => {
        if (TextboxProperties.regexFormat && !TextboxProperties.regexFormat.format.test(value)) {
            setError(TextboxProperties.regexFormat.errorMessage || "Invalid input");
            return false;
        }
        if (TextboxProperties.required && TextboxProperties.required && !value) {
            setError(TextboxProperties.required.errorMessage || "This field is required");
            return false;
        }
        setError(null);
        return true;
    };

    const labelPosition = TextboxProperties.labelPosition || "top"; // Default label position is "top" if not provided.

    /**
     * A function to handle changes to the input value. It updates the internal state and calls the onValidChange callback if the new value is valid. It also reports the validity of the input through the onValidReport callback if it is provided.
     * @param newValue - The new input value.
     */
    const handleChange = (newValue: string) => {
        setIntValue(newValue);
        const isValid = validateInput(newValue);

        // Always propagate changes so controlled inputs can be edited to empty values.
        TextboxProperties.onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>);

        if (isValid) {
            TextboxProperties.onValidChange?.(TextboxProperties.field, newValue);
        }

        if (TextboxProperties.onValidReport) {
            TextboxProperties.onValidReport(TextboxProperties.field, isValid);
        }
    };

    // Effect hook to validate the input value whenever it changes, but only after the initial mount to avoid validating on the first render.
    const onChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        handleChange(newValue);
    };

    // Effect hook to set the default value on initial mount and validate it. Primarily used to verify if a user enters a required field and leaves, it flags it as required.
    const onBlurEvent = (e: React.FocusEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        validateInput(newValue);
    }

    // Effect hook to validate the default value on initial mount and call the onValidChange callback if the default value is valid.
    useEffect(() => {
        if (isInitialMount.current && TextboxProperties.defaultValue) {
            handleChange(TextboxProperties.defaultValue);
        }
        isInitialMount.current = false;
    }, []);

    // Effect hook to sync internal state with defaultValue changes after initial mount
    useEffect(() => {
        if (!isInitialMount.current) {
            setIntValue(TextboxProperties.defaultValue || '');
        }
    }, [TextboxProperties.defaultValue]);

    return (
        <div>
            <div className={`flex ${labelPosition === "side" ? "items-center gap-2" : "flex-col"}`}>
                <label htmlFor={TextboxProperties.field} className={`${TextboxProperties.label ? '' : 'hidden'} mb-2 block text-sm/6 font-medium text-gray-900 dark:text-white text-start ${TextboxProperties.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''} ${labelPosition === "side" ? 'shrink-0 whitespace-nowrap' : ''}`}>
                    {TextboxProperties.label}
                </label>
                <input
                    id={TextboxProperties.field}
                    name={TextboxProperties.field}
                    type={TextboxProperties.type || "text"}
                    placeholder={TextboxProperties.placeholder || ''}
                    value={TextboxProperties.value ?? intValue}
                    readOnly={TextboxProperties.readOnly || false}
                    onChange={onChangeEvent}
                    onBlur={onBlurEvent}
                    onKeyDown={TextboxProperties.onKeyDown}
                    autoComplete={TextboxProperties.autoComplete || 'off'}
                    className={`block w-full bg-gray-50/20 py-1 text-gray-900 border-b ${error ? 'border-red-500' : 'border-gray-300'} transition placeholder:text-gray-400 focus:border-primary focus:outline-none focus:border-primary focus:border-b-2 disabled:cursor-default disabled:bg-transparent disabled:border-transparent dark:bg-gray-700/75 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400 dark:focus:border-blue-500 ${TextboxProperties.disabled ? 'opacity-50' : ''} pl-2`}
                    disabled={TextboxProperties?.disabled || false}
                />
            </div>

            {error && showErrorText ? (
                <p className="mt-0.5 text-sm text-red-600 text-start" id={`${TextboxProperties.field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    )
}