export type InputSize = 'small' | 'medium' | 'large';

export type ColorMode = 'light' | 'dark' | 'auto';

export type RequiredRule = boolean | { message?: string };

export type RegexRule = RegExp | { pattern: RegExp; message?: string };

/** CSS classes for different color modes. If {@link ColorMode} is 'light', the light classes are used; if 'dark', the dark classes are used. If 'auto', all the 'dark' classes are prepended with 'dark:' */
export interface ColorClasses {
    /** CSS classes for the light color mode. Can be a string or a record of strings. i.e. { container: 'bg-white', input: 'text-black' } */
    light: string | Record<string, string>;
    /** CSS classes for the dark color mode. Can be a string or a record of strings. i.e. { container: 'bg-neutral-900', input: 'text-white' } */
    dark: string | Record<string, string>;
}