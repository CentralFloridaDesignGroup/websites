import type { InputHTMLAttributes } from "react";
import { compileClasses, getRegexPattern, isRequired } from "cfdg/scripts";

import type { 
    InputSize, 
    ColorMode, 
    RequiredProperty, 
    RegexProperty, 
    ColorClassNamesFor
} from 'cfdg/types';

/** Properties for the Textbox component. */
export type TextboxProperties = Omit<InputHTMLAttributes<HTMLInputElement>, 'required' | 'size' | 'className' | 'id' | 'name' | 'pattern' | 'maxLength'> & {
    /** The name of the field. Should be unique */
    field: string;
    /** CSS classes for the component. */
    className?: string | ColorClassNamesFor<ColorMode>;
    /** The size of the input element. Default is 'medium' */
    size?: InputSize;
    /** Whether the field is required. */
    required?: RequiredProperty;
    /** The regular expression pattern to validate the input against. */
    regex?: RegexProperty;
    /** The color mode of the input element. Default is 'auto' */
    colorMode?: ColorMode;
    /** The maximum number of characters allowed in the input element. */
    characterLimit?: number;
}

export function Textbox(props: TextboxProperties) {
    const {
        field,
        className = "",
        size = 'medium',
        required,
        regex,
        colorMode = 'auto',
        characterLimit,
        ...rest
    } = props;

    const sizeClasses: Record<InputSize, string> = {
        small: "px-2 py-1 text-sm",
        medium: "px-3 py-2 text-base",
        large: "px-4 py-3 text-lg",
    };

    /** Compiled CSS classes for the input element based on the color mode. */
    const inputClasses = compileClasses(colorMode, typeof className === 'string' ? { 
        light: `${sizeClasses[size]} ${className}`, 
        dark: `${sizeClasses[size]} ${className}` 
    } : {
        light: `${sizeClasses[size]} ${className.light ?? ''}`,
        dark: `${sizeClasses[size]} ${className.dark ?? ''}`,
    });
    
    /** Indicates whether the field is required. */
    const isFieldRequired = isRequired(required);
    /** The regular expression pattern to validate the input against. */
    const regexPattern = getRegexPattern(regex);


    return (
        <input
            id={field}
            name={field}
            className={inputClasses}
            required={isFieldRequired}
            pattern={regexPattern?.source}
            maxLength={characterLimit}
            {...rest}
        />
    );
}