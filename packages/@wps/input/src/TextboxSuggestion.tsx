import { useState, useEffect, useMemo, useRef } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react";
import { ChevronDown } from "lucide-react";


interface TextboxSuggestionProperties {
    /**
     * The name of the field that this textbox represents. This is used as the key when calling the onValidChange callback to identify which field has changed.
     */
    field: string;
    /**
     * An array of suggestion objects for the textbox. Each object can have any structure but should contain at least one key-value pair for display.
     */
    suggestions: Record<string, any>[] | { key: string; value: string }[];
    /**
     * The label text for the textbox. This is displayed above the input field.
     */
    label?: string;
    /**
     * The position of the label relative to the input field. If "top", the label is displayed above the input field. If "side", the label is displayed to the left of the input field. The default is "top".
     */
    labelPosition?: "top" | "side";
    /**
     * The type of input for the textbox. This determines the keyboard layout and input behavior.
     */
    type?: "text" | "password" | "email" | "number" | "date" | "tel";
    /**
     * If true, the textbox will be read-only and cannot be edited by the user.
     */
    readonly?: boolean;
    /**
     * The placeholder text for the textbox. This is displayed inside the input field when it is empty.
     */
    placeholder?: string;
    /**
     * The default value for the textbox. This is used to initialize the input field.
     */
    defaultValue?: string;
    /**
     * If true, the textbox is required and must be filled out before form submission. If the user tries to submit the form without filling out a required textbox, a validation error message will be displayed.
     */
    required?: {
        /**
         * Indicates whether the textbox is required. If true, the user must provide a value before form submission.
         */
        isRequired: boolean;
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
    onValidChange: (field: string, value: string) => void;
    /**
     * A callback function that is called when the input value changes and its validity is determined. It receives the field name and a boolean indicating whether the value is valid.
     */
    onValidReport?: (field: string, isValid: boolean) => void;
}

export function TextboxSuggestion(options: TextboxSuggestionProperties): React.JSX.Element {
    const [error, setError] = useState<string | null>(null);        // state to hold validation error messages
    const [intValue, setIntValue] = useState('');                   // state to hold the current input value
    const [query, setQuery] = useState("");                         // state to hold the current query for suggestions
    const isInitialMount = useRef(true);                            // ref to track if the component is mounting for the first time

    const filteredSuggestions: Record<string, any>[] = useMemo(() => {
        if (!options.suggestions) return [];
        return query === "" ? options.suggestions : options.suggestions.filter(suggestion => {
            const displayValue = suggestion.value !== undefined ? suggestion.value : Object.values(suggestion)[0];
            return displayValue?.toString().toLowerCase().includes(query.toLowerCase());
        });
    }, [options.suggestions, query]);

    const validateInput = (value: string) => {
        if (options.regexFormat && !options.regexFormat.format.test(value)) {
            setError(options.regexFormat.errorMessage || "Invalid input");
            return false;
        }
        if (options.required && options.required.isRequired && !value) {
            setError(options.required.errorMessage || "This field is required");
            return false;
        }
        setError(null);
        return true;
    };

    const handleChange = (value: string | null) => {
        if (value === undefined || value === null) value = "";
        setIntValue(value);
        setQuery(value);
        setIntValue(value);
        if (validateInput(value)) {
            options.onValidChange(options.field, value);
            if (options.onValidReport) {
                options.onValidReport(options.field, true);
            }
        }
        else {
            if (options.onValidReport) {
                options.onValidReport(options.field, false);
            }
        }
    };

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
        if (isInitialMount.current && options.defaultValue) {
            handleChange(options.defaultValue);
        }
        isInitialMount.current = false;
    }, []);

    return (
        <div>
            <Combobox
                as="div"
                value={intValue}
                onChange={handleChange}
            >
                <div className={`flex w-full ${options.labelPosition === "side" ? "flex-row gap-2 items-center" : "flex-col"}`}>
                    <label
                        htmlFor={options.field}
                        className={`${options.label ? '' : 'hidden'} block text-sm/6 font-medium text-gray-900 dark:text-gray-300 text-start ${options.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''} ${options.labelPosition === "side" ? 'shrink-0 whitespace-nowrap' : ''}`}
                    >
                        {options.label}
                    </label>
                    <div className={`relative ${options.labelPosition === "side" ? 'flex-1' : ''}`}>
                        <ComboboxInput
                            id={options.field}
                            name={options.field}
                            className={`block w-full bg-gray-50/20 py-1 text-gray-900 dark:text-gray-300 dark:bg-gray-700 border-b ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} transition placeholder:text-gray-400 focus:border-primary focus:outline-none focus:border-primary focus:border-b-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 dark:disabled:bg-gray-700 dark:disabled:text-gray-300 pl-2`}
                            placeholder={options.placeholder || ''}
                            value={intValue}
                            onChange={onChangeEvent}
                            onBlur={onBlurEvent}
                            autoComplete="off"
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-300" aria-hidden="true" />
                        </ComboboxButton>
                        <ComboboxOptions transition className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white dark:bg-gray-800 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {filteredSuggestions.length !== 0 ? (
                                filteredSuggestions.map((suggestion, index) => {
                                    const displayValue = suggestion.value !== undefined ? suggestion.value : Object.values(suggestion)[0];
                                    return (
                                        <ComboboxOption
                                            key={`${suggestion.key || index}-${displayValue}`}
                                            value={displayValue}
                                            className={({ focus }) => `relative cursor-default select-none py-2 px-4 ${focus ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-300'}`}
                                        >
                                            {displayValue}
                                        </ComboboxOption>
                                    );
                                })
                            ) : null}
                        </ComboboxOptions>
                    </div>
                </div>
            </Combobox>


            {error ? (
                <p className="mt-0.5 text-sm text-red-600 text-start" id={`${options.field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    )
}