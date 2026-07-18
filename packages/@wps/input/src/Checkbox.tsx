import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cx, labelClass, type InputColorMode } from "./styles";

/**
 * Props for the shared checkbox and switch control.
 */
export interface CheckboxProperties extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    /** Renders a standard checkbox or horizontal switch. Defaults to "checkbox". */
    type?: "checkbox" | "switch";
    /** Visible label text. */
    label?: string;
    /** Target color mode for the control. Defaults to "light". */
    colorMode?: InputColorMode;
}

/**
 * Dense industrial checkbox with standard checkbox and switch presentations.
 */
export function Checkbox({
    required,
    disabled,
    type = "checkbox",
    label,
    colorMode = "light",
    checked,
    defaultChecked,
    onChange,
    className,
    id,
    ...inputProps
}: CheckboxProperties): React.JSX.Element {
    const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
    const isChecked = checked ?? internalChecked;
    const inputId = id ?? inputProps.name ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "checkbox";

    useEffect(() => {
        if (checked === undefined) setInternalChecked(defaultChecked ?? false);
    }, [defaultChecked, checked]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (checked === undefined) setInternalChecked(event.target.checked);
        onChange?.(event);
    };

    if (type === "switch") {
        return (
            <div className="flex items-center justify-start gap-3">
                <label
                    htmlFor={inputId}
                    className={cx(
                        "group relative inline-flex h-6 w-12 shrink-0 cursor-pointer border-b p-0.5 transition-colors focus-within:border-b-2 focus-within:border-primary",
                        colorMode === "dark" ? "border-gray-600 bg-gray-700" : colorMode === "auto" ? "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700" : "border-gray-300 bg-white",
                        isChecked && (colorMode === "dark" ? "bg-primary-500" : colorMode === "auto" ? "bg-primary dark:bg-primary-500" : "bg-primary"),
                        disabled && "cursor-default opacity-50",
                        className
                    )}
                >
                    <span className="sr-only">{label ?? inputId}</span>
                    <span className={cx("relative flex size-5 items-center justify-center bg-white shadow-xs ring-1 ring-gray-400 transition-transform", isChecked && "translate-x-6")}>
                        {isChecked ? <Check className="size-4 stroke-primary" /> : <X className="size-4 stroke-gray-400" />}
                    </span>
                    <input
                        {...inputProps}
                        id={inputId}
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled || false}
                        required={required || false}
                        onChange={handleChange}
                        className="absolute inset-0 size-full appearance-none focus:outline-none"
                    />
                </label>
                {label ? (
                    <label htmlFor={inputId} className={labelClass({ colorMode, required, hidden: false })}>
                        {label}
                    </label>
                ) : null}
            </div>
        );
    }

    return (
        <div className="flex h-6 shrink-0 items-center">
            <div className="group grid size-5 grid-cols-1">
                <input
                    {...inputProps}
                    id={inputId}
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled || false}
                    required={required || false}
                    onChange={handleChange}
                    className={cx(
                        "col-start-1 row-start-1 appearance-none border-b bg-white transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus:border-b-2 focus:border-primary focus:outline-none disabled:bg-gray-100 forced-colors:appearance-auto",
                        colorMode === "dark" ? "border-gray-600 bg-gray-800 checked:bg-primary-500" : colorMode === "auto" ? "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-primary-500" : "border-gray-300",
                        disabled && "opacity-50",
                        className
                    )}
                />
                {isChecked ? (
                    <Check className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-white" />
                ) : (
                    <X className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-gray-400" />
                )}
            </div>
            {label ? (
                <label htmlFor={inputId} className={cx("ps-2 pb-1", labelClass({ colorMode, required, hidden: false }))}>
                    {label}
                </label>
            ) : null}
        </div>
    );
}
