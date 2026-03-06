import { useState, useEffect, useRef, useMemo } from "react";
import { Combobox as HeadlessCombobox, ComboboxButton, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

/**
 * A customizable combobox component that allows users to select from a list of options. It supports features such as default selection, disabled state, and validation reporting.
 */
interface ComboboxProperties {
    /**
     * The name of the field that this combobox represents. This is used as the key when calling the onValidChange callback to identify which field has changed.
     */
    field: string;
    /**
     * The label text for the combobox. This is displayed above the select element. If not provided, the label will be hidden but the component will still be accessible to screen readers.
     */
    label: string;
    /**
     * The position of the label relative to the select element. If "top", the label is displayed above the select element. If "side", the label is displayed to the left of the select element. The default is "top".
     */
    labelPosition?: "top" | "side";
    /**
     * A list of options to be displayed in the combobox. This can be either an object where keys are option labels and values are option values, or an array of objects with key and value properties.
     */
    selections: Record<string, any> | { key: string; value: string }[];
    /**
     * If true, the combobox will be disabled and cannot be interacted with.
     */
    disabled?: boolean;
    /**
     * If true, the combobox is required and must have a selection before form submission (first option in all comboboxes is empty).
     */
    required?: boolean;
    /**
     * Placeholder text to display when no option is selected. if not defined, the placeholder will default to "Select an option". If required is true and no default selection is provided, will report validation errors if the user tries to submit the form without making a selection.
     */
    placeholder?: string;
    /**
     * The index of the option to be selected by default when the component mounts. If not provided, no option will be selected by default and the placeholder will be shown until the user makes a selection.
     */
    defaultIndex?: number;
    /**
     * A callback function that is called when the selected option changes. It receives the field name and the new value as arguments.
     * @param field The name of the field that triggered the change.
     * @param value The new value selected in the combobox.
     * @returns void
     */
    onValidChange: (field: string, value: string) => void;
    /**
     * A callback function that is called when the validity of the selected option changes. It receives the field name and a boolean indicating whether the current selection is valid as arguments.
     * @param field The name of the field that triggered the validity change.
     * @param isValid A boolean indicating whether the current selection is valid.
     * @returns void
     */
    onValidReport?: (field: string, isValid: boolean) => void;
    /**
     * Optional style overrides for combobox layout elements.
     */
    props?: {
        /**
         * Additional class names applied to the component wrapper.
         */
        classNames?: string;
        /**
         * Additional class names applied to the input element.
         */
        inputClassNames?: string;
        /**
         * Additional class names applied to the options container.
         */
        optionsClassNames?: string;
    };
}

export function Combobox(comboboxProperties: ComboboxProperties): React.JSX.Element {
    const [error, setError] = useState<string | null>(null); // state to hold validation error messages
    const [intValue, setIntValue] = useState(''); // internal state to manage the selected value of the combobox
    const [options, setOptions] = useState<{ key: string; value: string }[]>([]); // state to hold the options for the combobox, normalized to an array of objects with key and value properties
    const isInitialMount = useRef(true); // ref to track if the component is mounting for the first time, used for setting default value on initial render

    const selectedLabel = useMemo(() => {
        const selectedOption = options.find((option) => option.value === intValue);
        return selectedOption ? selectedOption.key : '';
    }, [intValue, options]);

    const isPlaceholderSelected = useMemo(() => {
        return options[0]?.value === intValue;
    }, [intValue, options]);

    // Handler for when the combobox value changes, calling the onChange callback with the new value and performing validation.
    const handleChange = (value: string | null) => {
        const newValue = value ?? '';
        setIntValue(newValue);
        if (comboboxProperties.required && !newValue) {
            setError("This field is required.");
            if (comboboxProperties.onValidReport) {
                comboboxProperties.onValidReport(comboboxProperties.field, false);
            }
        } else {
            setError(null);
            comboboxProperties.onValidChange(comboboxProperties.field, newValue);
            if (comboboxProperties.onValidReport) {
                comboboxProperties.onValidReport(comboboxProperties.field, true);
            }
        }
    }

    // Keep options in sync with incoming selections/placeholder so parent resets are reflected.
    useEffect(() => {
        const optionsArray = Array.isArray(comboboxProperties.selections) ? comboboxProperties.selections : Object.entries(comboboxProperties.selections).map(([key, value]) => ({ key, value }));
        const fullOptionsArray = [{ key: comboboxProperties.placeholder ? comboboxProperties.placeholder : 'Select...', value: '' }, ...optionsArray];

        setOptions(fullOptionsArray);

        if (comboboxProperties.defaultIndex !== undefined) {
            const defaultOptionIndex = comboboxProperties.defaultIndex + 1;
            const defaultOption = fullOptionsArray[defaultOptionIndex];

            if (defaultOption) {
                setIntValue(defaultOption.value);
                if (isInitialMount.current) {
                    handleChange(defaultOption.value);
                }
            }
            else {
                if (optionsArray.length < defaultOptionIndex) {
                    console.warn(`Combobox defaultIndex ${comboboxProperties.defaultIndex} is out of bounds for options length ${optionsArray.length}.`);
                }
                setIntValue(fullOptionsArray[0].value);
                if (isInitialMount.current) {
                    handleChange(fullOptionsArray[0].value);
                }
            }
        }

        isInitialMount.current = false;
    }, [comboboxProperties.selections, comboboxProperties.placeholder, comboboxProperties.defaultIndex]);

    return (
        <div className={comboboxProperties.props?.classNames || ''}>
            <HeadlessCombobox
                as="div"
                value={intValue}
                onChange={handleChange}
                disabled={comboboxProperties.disabled}
            >
                <div className={`flex w-full ${comboboxProperties.labelPosition === "side" ? "flex-row gap-2 items-center" : "flex-col"}`}>
                    <label
                        htmlFor={comboboxProperties.field}
                        className={`${comboboxProperties.label ? '' : 'hidden'} block text-sm/6 font-medium text-gray-900 dark:text-white text-start ${comboboxProperties.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''} ${comboboxProperties.labelPosition === "side" ? 'shrink-0 whitespace-nowrap' : ''}`}
                    >
                        {comboboxProperties.label}
                    </label>
                    <div className={`relative ${comboboxProperties.labelPosition === "side" ? 'flex-1' : ''}`}>
                        <ComboboxInput
                            id={comboboxProperties.field}
                            name={comboboxProperties.field}
                            className={`block w-full bg-gray-50/20 py-1 pl-2 text-gray-900 border-b ${error ? 'border-red-500' : 'border-gray-300'} transition focus:border-primary focus:outline-none focus:border-primary focus:border-b-2 disabled:cursor-default disabled:bg-transparent disabled:border-transparent disabled:outline-transparent dark:bg-gray-700/75 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400 dark:focus:border-blue-500 ${(isPlaceholderSelected && !comboboxProperties.placeholder) ? 'text-gray-400' : ''} ${comboboxProperties.props?.inputClassNames || ''}`}
                            placeholder={comboboxProperties.placeholder || 'Select...'}
                            displayValue={() => (isPlaceholderSelected ? (comboboxProperties.placeholder ?? '') : selectedLabel)}
                            readOnly
                            autoComplete="off"
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 disabled:hidden" disabled={comboboxProperties.disabled}>
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </ComboboxButton>
                        <ComboboxOptions transition className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm ${comboboxProperties.props?.optionsClassNames || ''}`}>
                            {options.length !== 0 ? (
                                options.map((option, index) => (
                                    <ComboboxOption
                                        key={`${option.key}-${option.value}-${index}`}
                                        value={option.value}
                                        className={({ focus, selected }) => `relative cursor-default select-none py-2 px-4 ${focus ? 'bg-primary text-white dark:bg-primary dark:text-white' : 'text-gray-900 dark:text-white'}  dark:bg-gray-700 ${selected ? 'font-bold italic' : 'font-normal'}`}
                                    >
                                        {option.key}
                                    </ComboboxOption>
                                ))
                            ) : null}
                        </ComboboxOptions>
                    </div>
                </div>
            </HeadlessCombobox>


            {error ? (
                <p className="mt-0.5 text-sm text-red-600 text-start" id={`${comboboxProperties.field}-error`}>
                    <span className="font-medium">Error: </span>{error}
                </p>
            ) : null}
        </div>
    )
}