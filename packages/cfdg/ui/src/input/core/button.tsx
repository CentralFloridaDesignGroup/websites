import type { ButtonHTMLAttributes, ReactNode } from "react";
import { compileClasses } from "cfdg/scripts";

import type {
    ColorClassNamesFor,
    ColorMode,
    InputSize,
} from "cfdg/types";

/** Properties for the Button component. */
export type ButtonProperties = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'id' | 'name' | 'type'> & {
    /** The name of the field. Should be unique when provided. */
    field?: string;
    /** The content to display inside the button. */
    children?: ReactNode;
    /** CSS classes for the component. */
    className?: string | ColorClassNamesFor<ColorMode>;
    /** The size of the button element. Default is 'medium'. */
    size?: InputSize;
    /** The color mode of the button element. Default is 'auto'. */
    colorMode?: ColorMode;
    /** Native HTML button behavior. Defaults to a non-submitting button. */
    type?: 'button' | 'submit' | 'reset';
}

function classValueToString(classValue: string | string[] | undefined): string {
    return Array.isArray(classValue) ? classValue.join(' ') : (classValue ?? '');
}

/** Shared raw button element with size and color-mode class compilation. */
export function Button(props: ButtonProperties) {
    const {
        field,
        children,
        className = "",
        size = 'medium',
        colorMode = 'auto',
        type = 'button',
        ...rest
    } = props;

    const sizeClasses: Record<InputSize, string> = {
        small: "px-2 py-1 text-sm",
        medium: "px-3 py-2 text-base",
        large: "px-4 py-3 text-lg",
    };

    /** Compiled CSS classes for the button element based on the color mode. */
    const buttonClasses = compileClasses(colorMode, typeof className === 'string' ? {
        light: `${sizeClasses[size]} ${className}`,
        dark: `${sizeClasses[size]} ${className}`,
    } : {
        light: `${sizeClasses[size]} ${classValueToString(className.light)}`,
        dark: `${sizeClasses[size]} ${classValueToString(className.dark)}`,
    });

    return (
        <button
            id={field}
            name={field}
            type={type}
            className={buttonClasses}
            {...rest}
        >
            {children}
        </button>
    );
}
