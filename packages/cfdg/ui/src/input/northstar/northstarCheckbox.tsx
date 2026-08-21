import { ChangeEvent, useState } from 'react';
import { Checkbox } from '../core/checkbox';
import type { CheckboxProperties } from '../core/checkbox';
import { classValueToString, isRequired } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode } from 'cfdg/types/v2';
import { Check, X } from 'lucide-react';

export type NorthstarCheckboxProperties = CheckboxProperties & {
    /** The name of the field. Should be unique */
    label?: string;
    /** The description of the field. */
    description?: string;
};

export function NorthstarCheckbox(props: NorthstarCheckboxProperties) {
    const {
        field,
        label,
        description,
        className,
        colorMode = 'auto',
        required,
        onChange,
        ...rest
    } = props;

    const [intChecked, setIntChecked] = useState(rest.checked ?? rest.defaultChecked ?? false);

    const customClassNames: ColorClassNamesFor<ColorMode> = typeof className === 'string' ? {
        light: `${className}`,
        dark: `${className}`
    } : {
        light: `${className?.light ?? ''}`,
        dark: `${className?.dark ?? ''}`,
    };

    const baseClasses = `col-start-1 row-start-1 appearance-none border w-5 h-5 checked:bg-primary checked:border-primary disabled:text-gray-400`;

    const inputClassName: ColorClassNamesFor<ColorMode> = {
        light: `${baseClasses} bg-neutral-300 disabled:bg-neutral-200 disabled:border-neutral-300 ${classValueToString(customClassNames.light)}`,
        dark: `${baseClasses} bg-neutral-700 disabled:bg-neutral-600 disabled:border-neutral-500 ${classValueToString(customClassNames.dark)}`,
    };

    const isFieldRequired = isRequired(required);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setIntChecked(e.target.checked);
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex h-6 shrink-0 items-center gap-2">
                <div className="group grid size-5 grid-cols-1">
                    <Checkbox
                        field={field}
                        className={inputClassName}
                        required={isFieldRequired}
                        colorMode={colorMode}
                        onChange={handleChange}
                        {...rest}
                    />
                    {intChecked ? (
                        <Check className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-white" />
                    ) : (
                        <X className="pointer-events-none col-start-1 row-start-1 size-4 self-center justify-self-center stroke-gray-400" />
                    )}

                </div>
                {label && <span>{label}</span>}
            </div>
            {description && <p className="text-xs text-neutral-600 dark:text-neutral-300">{description}</p>}
        </div>
    );
}
