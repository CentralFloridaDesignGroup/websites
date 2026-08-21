import { Button, ButtonProperties } from '../core/button';
import { classValueToString } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode } from 'cfdg/types/v2';

export type NorthstarButtonProperties = ButtonProperties & {
    /** The style of the button.
     * - `Default`: Neutral white/gray treatment for standard actions.
     * - `Primary`: Northstar navy, typically used for main actions.
     * - `Secondary`: Soft teal/blue treatment for supporting actions.
     * - `Focused`: Northstar teal, used for the most prominent action in a section.
     */
    buttonStyle?: 'default' | 'primary' | 'secondary' | 'focused' | 'danger';
}

const BUTTON_STYLE_CLASSES: Record<NonNullable<NorthstarButtonProperties['buttonStyle']>, ColorClassNamesFor<ColorMode>> = {
    default: {
        light: 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 focus:ring-[#173244]/30',
        dark: 'border-neutral-600 bg-neutral-800 text-neutral-100 hover:bg-neutral-700 focus:ring-[#9cc4c9]/30',
    },
    primary: {
        light: 'border-black bg-black text-white hover:bg-gray-800 focus:ring-black/30',
        dark: 'border-black bg-black text-white hover:bg-gray-800 focus:ring-black/30',
    },
    secondary: {
        light: 'border-gray-700 bg-gray-700 text-white hover:bg-gray-800 focus:ring-gray-500/40',
        dark: 'border-gray-700 bg-gray-700 text-white hover:bg-gray-800 focus:ring-gray-500/40',
    },
    focused: {
        light: 'border-primary bg-primary text-white hover:bg-primary-700 focus:ring-primary-500/40',
        dark: 'border-primary bg-primary text-white hover:bg-primary-700 focus:ring-primary-500/40',
    },
    danger: {
        light: 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white focus:ring-red-500/40',
        dark: 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white focus:ring-red-500/40',
    },
};

export function NorthstarButton(props: NorthstarButtonProperties) {
    const {
        buttonStyle = 'default',
        className,
        colorMode = 'auto',
        ...rest
    } = props;

    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded border font-semibold transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';
    const styleClasses = BUTTON_STYLE_CLASSES[buttonStyle];
    const buttonClasses: ColorClassNamesFor<ColorMode> = typeof className === 'string' ? {
        light: `${baseClasses} ${styleClasses.light} ${className}`,
        dark: `${baseClasses} ${styleClasses.dark} ${className}`,
    } : {
        light: `${baseClasses} ${styleClasses.light} ${classValueToString(className?.light)}`,
        dark: `${baseClasses} ${styleClasses.dark} ${classValueToString(className?.dark)}`,
    };

    return (
        <Button
            {...rest}
            className={buttonClasses}
            colorMode={colorMode}
        />
    );
}
