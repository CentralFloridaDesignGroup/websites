import { useState, useEffect, useRef } from "react";

/**
 * A customizable textarea component that supports validation, error handling, and various configuration options such as allowing newlines and setting a default value.
 */
interface TextareaProperties extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /**
     * The name of the field that this textarea represents. This is used as the key when calling the onValidChange callback to identify which field has changed.
     */
    field: string;
    /**
     * The label text for the textarea. This is displayed above the textarea input field. If not provided, the label will be hidden but the component will still be accessible to screen readers.
     */
    label?: string;
    /**
     * The placeholder text for the textarea. This is displayed inside the textarea when it is empty. If not provided, no placeholder will be shown.
     */
    placeholder?: string;
    /**
     * The default value for the textarea. This is used to initialize the textarea input field when the component mounts. If not provided, the textarea will be empty by default.
     */
    defaultValue?: string;
    /**
     * If true, the textarea is required and must be filled out before form submission. If the user tries to submit the form without filling out a required textarea, a validation error message will be displayed.
     */
    required?: boolean & {
        /**
         * An optional custom error message to display when the required validation fails. If not provided, a default error message will be shown.
         */
        errorMessage?: string;
    };
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
    /**
     * If true, the textarea will be disabled and cannot be interacted with. The textarea will have a disabled appearance and will not respond to user input.
     */
    disabled?: boolean;
    /**
     * If true, the textarea will allow newlines. If false, pressing Enter will not create a new line.
     */
    allowNewlines?: boolean;
    /**
     * If true, the textarea will be read-only and cannot be edited by the user. The textarea will have a read-only appearance and will not allow changes to its value.
     */
    readonly?: boolean;
    /**
     * A callback function that is called when the input value changes and is valid according to the provided validation rules. It receives the field name and the new value as arguments.
     * @param field - The name of the field that has changed.
     * @param value - The new value of the field.
     * @returns void
     */
    onValidChange?: (field: string, value: string) => void;
    /**
     * A callback function that is called when the validity of the input value changes. It receives the field name and a boolean indicating whether the current value is valid as arguments.
     * @param field - The name of the field that has changed.   
     * @param isValid - A boolean indicating whether the current value of the field is valid according to the provided validation rules.
     * @returns void
     */
    onValidReport?: (field: string, isValid: boolean) => void;
}

/**
 * The Textarea component renders a textarea input field with associated label and validation logic. It manages its own internal state for the input value and error messages, and communicates changes and validation status back to the parent component through the provided callbacks.
 * 
 * @param textareaProperties - An object containing properties to configure the behavior and appearance of the textarea component.
 * @returns A React JSX element representing the textarea component.
 */
export function Textarea(textareaProperties: TextareaProperties): React.JSX.Element {
    const [error, setError] = useState<string | null>(null);    // state to hold validation error messages
    const [intValue, setIntValue] = useState('');               // internal state to manage the value of the textarea
    const isInitialMount = useRef(true);                        // ref to track if the component is mounting for the first time

    const HandleChange = (value: string) => {
        setIntValue(value);
        if (textareaProperties.required && !value) {
            setError(textareaProperties.required.errorMessage || "This field is required.");
        } else {
            if (textareaProperties.regexFormat && !textareaProperties.regexFormat.format.test(value)) {
                setError(textareaProperties.regexFormat.errorMessage || "Invalid format.");
            } else {
                setError(null);
                textareaProperties.onValidChange?.(textareaProperties.field, value);
                textareaProperties.onChange?.({ target: { value } } as React.ChangeEvent<HTMLTextAreaElement>);
                if (textareaProperties.onValidReport) {
                    textareaProperties.onValidReport(textareaProperties.field, true);
                }
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!textareaProperties.allowNewlines && e.key === "Enter") {
            e.preventDefault(); // prevent newlines if allowNewlines is false
        }
    }

    // Effect hook to set the value of the textArea and report the validated value if the entered value meets requirements.
    const onChangeEvent = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        HandleChange(newValue);
    }

    // Effect hook to set the value of the textArea and report the validated value if the entered value meets requirements. OnBlur catches if a user enters a required field and leaves, it flags it as required.
    const onBlurEvent = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        HandleChange(newValue);
    }

    useEffect(() => {
        if (isInitialMount.current && textareaProperties.defaultValue) {
            HandleChange(textareaProperties.defaultValue);
        }
        isInitialMount.current = false;
    }, []);

    return (
        <div>
            <div>
                <label htmlFor={textareaProperties.field} className={`${textareaProperties.label ? '' : 'hidden'} block text-sm/6 font-medium text-gray-900 dark:text-white text-start mb-2 ${textareaProperties.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
                    {textareaProperties.label}
                </label>
                <textarea
                    id={textareaProperties.field}
                    name={textareaProperties.field}
                    placeholder={textareaProperties?.placeholder || ''}
                    value={intValue}
                    readOnly={textareaProperties?.readonly || false}
                    onChange={onChangeEvent}
                    onBlur={onBlurEvent}
                    onKeyDown={handleKeyDown}
                    className={`block w-full bg-gray-50/20 py-1 text-gray-900 border-b border-t ${error ? 'border-red-500' : 'border-gray-300'} transition placeholder:text-gray-400 focus:border-primary focus:outline-none focus:border-primary focus:border-b-2 focus:border-t-2  disabled:cursor-default disabled:bg-transparent disabled:border-transparent h-[100px] dark:bg-gray-700/75 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400 dark:focus:border-blue-500`}
                    disabled={textareaProperties?.disabled || false}
                />
            </div>

            {error ? (
                <p className="mt-0.5 text-sm text-red-600 text-start" id={`${textareaProperties.field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    )
}