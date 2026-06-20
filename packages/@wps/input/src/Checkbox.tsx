import { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

/**
 * Properties for the Checkbox component, including required and disabled states.
 * @param required - Whether the checkbox is required.
 * @param disabled - Whether the checkbox is disabled.
 */
export interface CheckboxProperties extends React.InputHTMLAttributes<HTMLInputElement> {
    required?: boolean;
    disabled?: boolean;
    type?: "checkbox" | "switch";
    label?: string;
}

/**
 * A generic checkbox input component that supports both standard checkbox and switch styles. It accepts a field name, label, current checked state, change handler, and additional properties for configuration.
 * @param field - The name of the field associated with the checkbox.
 * @param checked - The current checked state of the checkbox input.
 * @param type - The style of the checkbox, either "checkbox" for a standard checkbox or "switch" for a toggle switch appearance.
 * @param label - An optional label to display next to the checkbox.
 * @param onChange - A callback function that is called when the checked state of the checkbox changes, receiving the new value as an argument.
 * @param properties - An optional object containing additional configuration properties for the checkbox, such as required and disabled states.
 * @returns A JSX element representing the checkbox input component.
 */
export function Checkbox({
    required,
    disabled,
    type,
    label,
    ...properties
}: CheckboxProperties): React.JSX.Element {
    const [isChecked, setIsChecked] = useState(properties.checked || false);
    const isInitialMount = useRef(true);
    const { onChange, ...restProperties } = properties;

    useEffect(() => {
        if (isInitialMount.current) {
            setIsChecked(properties.checked || false);
            isInitialMount.current = false;
        }
    }, []);

    return (
        <>
            {(type === undefined || type === 'checkbox') && (
                <div className="flex h-6 shrink-0 items-center">
                    <div className="group grid size-5 grid-cols-1">
                        <input
                            type="checkbox"
                            disabled={disabled || false}
                            className="col-start-1 row-start-1 appearance-none border-b border-gray-300 bg-white transition-colors duration-200 ease-in-out checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus:border-b-2 focus:border-primary focus:outline-none disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-primary-500 dark:indeterminate:bg-primary-500 dark:focus:border-primary dark:disabled:bg-gray-700 dark:disabled:checked:bg-gray-700"
                            {...restProperties}
                            onChange={(e) => {
                                setIsChecked(e.target.checked);
                                onChange?.(e);
                            }}
                        />

                        <Check
                            fill="none"
                            className={`pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 ${isChecked ? "block" : "hidden"}`}
                        />
                        <X
                            fill="none"
                            className={`pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-gray-400 group-has-disabled:stroke-gray-950/25 ${isChecked ? "hidden" : "block"}`}
                        />

                    </div>
                    {label && <label className="ps-2 pb-1 text-gray-900 dark:text-gray-300">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    }
                </div>
            )}
            {type === 'switch' && (
                <div className="flex items-center justify-start gap-3">
                    <div className="group relative inline-flex w-12 shrink-0 bg-white border-b border-gray-300 p-0.5 transition-colors duration-200 ease-in-out has-checked:bg-primary dark:has-checked:bg-primary-500 focus-within:border-b-2 focus-within:border-primary focus-within:outline-none disabled:bg-gray-100 disabled:has-checked:bg-gray-100 dark:bg-gray-500 dark:border-gray-700 dark:disabled:bg-gray-700 dark:disabled:has-checked:bg-gray-700"
                        {...restProperties}

                    >
                        <span className="relative flex size-5 items-center justify-center bg-white shadow-xs ring-1 ring-gray-400 transition-transform duration-200 ease-in-out group-has-checked:translate-x-6">
                            <Check
                                className={`size-4 stroke-primary transition-opacity duration-150 ${isChecked ? "block" : "hidden"}`}
                            />
                            <X
                                className={`size-4 stroke-gray-400 transition-opacity duration-150 ${isChecked ? "hidden" : "block"}`}
                            />
                        </span>
                        <input
                            type="checkbox"
                            disabled={disabled || false}
                            className="absolute inset-0 size-full appearance-none focus:outline-hidden"
                            {...restProperties}
                            onChange={(e) => {
                                setIsChecked(e.target.checked);
                                onChange?.(e);
                            }}
                        />
                    </div>
                    {label && <label className={`text-gray-700 pb-1 dark:text-gray-300 ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>{label}</label>}
                </div>
            )}
        </>
    )
}