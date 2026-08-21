/** The size of a V1 input element. */
export type InputSize = 'small' | 'medium' | 'large';

/** The color mode of the application. */
export type ColorMode = 'light' | 'dark' | 'auto';

/** One or more CSS class names for a UI color mode. */
export type ClassNameValue = string | string[];

/** A property that indicates whether a field is required. Can be a boolean or an object with an optional message. */
export type RequiredProperty = boolean | { message?: string };

/** A property that represents a regular expression. Can be a RegExp object or an object with a pattern and an optional message. */
export type RegexProperty = RegExp | { pattern: RegExp; message?: string };

/** Required class names for a known color mode. Causes typecheck errors if the required classes are not provided for the {@link ColorMode}. */
export type ColorClassNamesFor<TColorMode extends ColorMode> =
    [TColorMode] extends ['light']
        ? { light: ClassNameValue; dark?: ClassNameValue }
        : [TColorMode] extends ['dark']
            ? { light?: ClassNameValue; dark: ClassNameValue }
            : { light: ClassNameValue; dark: ClassNameValue };
