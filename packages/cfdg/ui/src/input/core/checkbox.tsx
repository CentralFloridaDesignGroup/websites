import type { InputHTMLAttributes } from "react";
import { compileClasses, isRequired } from "cfdg/scripts";

import type {
    RequiredProperty,
    ColorClassNamesFor
} from 'cfdg/types';

export type CheckboxProperties = Omit<InputHTMLAttributes<HTMLInputElement>, 'required' | 'className' | 'id' | 'name'> & {
    /** The name of the field. Should be unique */
    field: string;
    /** CSS classes for the component. */
    className?: string | ColorClassNamesFor<'light' | 'dark'>;
    /** Whether the field is required. */
    required?: RequiredProperty;
    /** The color mode of the input element. Default is 'auto' */
    colorMode?: 'light' | 'dark' | 'auto';
}

export function Checkbox(props: CheckboxProperties) {
    const {
        field,
        className = "",
        required,
        colorMode = 'auto',
        ...rest
    } = props;

    /** Compiled CSS classes for the input element based on the color mode. */
    const inputClasses = compileClasses(colorMode, typeof className === 'string' ? {
        light: `${className}`,
        dark: `${className}`
    } : {
        light: `${className.light ?? ''}`,
        dark: `${className.dark ?? ''}`,
    });

    /** Indicates whether the field is required. */
    const isFieldRequired = isRequired(required);

    return (
        <input
            type="checkbox"
            id={field}
            name={field}
            className={inputClasses}
            required={isFieldRequired}
            {...rest}
        />
    );
}