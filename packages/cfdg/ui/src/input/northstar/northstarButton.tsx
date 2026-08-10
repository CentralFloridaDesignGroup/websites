import { Button, ButtonProperties } from '../core/button';
import { classValueToString } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode } from 'cfdg/types';

export type NorthstarButtonProperties = ButtonProperties & {
    /** The style of the button.
     * - `Primary`: Black with white text or light with black text, typically used for main actions.
     * - `Secondary`: gray with white text or light gray with black text, typically used for secondary actions.
     * - `Focused`: Primary with white text or light Primary with black text, typically used for focused actions.
     */
    buttonStyle?: 'primary' | 'secondary' | 'focused';
}

const BUTTON_STYLE_CLASSES: Record<NonNullable<NorthstarButtonProperties['buttonStyle']>, ColorClassNamesFor<ColorMode>> = {
    primary: {
        light: 'border border-black bg-black text-white hover:bg-gray-800 focus:ring-2 focus:ring-black/30',
        dark: 'border border-gray-100 bg-gray-100 text-black hover:bg-white focus:ring-2 focus:ring-white/40',
    },
    secondary: {
        light: 'border border-gray-700 bg-gray-700 text-white hover:bg-gray-800 focus:ring-2 focus:ring-gray-500/40',
        dark: 'border border-gray-200 bg-gray-200 text-black hover:bg-gray-300 focus:ring-2 focus:ring-white/40',
    },
    focused: {
        light: 'border border-primary bg-primary text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500/40',
        dark: 'border border-primary-200 bg-primary-200 text-black hover:bg-primary-100 focus:ring-2 focus:ring-primary-200/50',
    },
};

export function NorthstarButton(props: NorthstarButtonProperties) {
    const {
        buttonStyle = 'primary',
        className,
        colorMode = 'auto',
        ...rest
    } = props;

    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-none font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';
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
