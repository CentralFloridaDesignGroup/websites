import type {
  ColorMode,
  RequiredProperty,
  RegexProperty,
  ColorClassNamesFor,
} from "cfdg/types";

/**
 * Compiles the appropriate class names based on the provided color mode and class names.
 * @param colorMode - The current color mode of the application. Can be 'light', 'dark', or 'auto'.
 * @param classNames - An object containing the class names for light and dark modes.
 * @returns String containing the compiled class names based on the color mode.
 */
export function compileClasses<TColorMode extends ColorMode>(
  colorMode: TColorMode,
  classNames: ColorClassNamesFor<TColorMode>,
): string {
  const { light, dark } = classNames;
  if (!light && colorMode === "light") {
    console.error(
      "CompileClasses: No light classes provided for color mode 'light'.",
    );
  }
  if (!dark && colorMode === "dark") {
    console.error(
      "CompileClasses: No dark classes provided for color mode 'dark'.",
    );
  }
  if ((!light || !dark) && colorMode === "auto") {
    console.error(
      "CompileClasses: Light and dark classes are required for color mode 'auto'.",
    );
  }
  const lightClasses = Array.isArray(light) ? light.join(" ") : (light ?? "");
  const darkClasses = Array.isArray(dark) ? dark.join(" ") : (dark ?? "");
  switch (colorMode) {
    case "light":
      return lightClasses;
    case "dark":
      return darkClasses;
    case "auto":
      return (
        darkClasses
          .split(" ")
          .map((cls) => `dark:${cls}`)
          .join(" ") +
        " " +
        lightClasses
      );
    default:
      return lightClasses;
  }
}

/**
 * Type guard to check if a required property is an object with an optional message.
 * @param required - The required property to check.
 * @returns True if the required property is a boolean or an object with an optional message, false otherwise.
 */
export function isRequired(required: RequiredProperty | undefined): boolean {
  return (
    typeof required === "boolean" ||
    (typeof required === "object" && required !== null)
  );
}

/**
 * Retrieves the message from a RequiredProperty if it is an object, otherwise returns undefined.
 * @param required - The RequiredProperty to extract the message from.
 * @returns The message string if available, otherwise undefined.
 */
export function getRequiredMessage(
  required: RequiredProperty | undefined,
): string | undefined {
  if (typeof required === "object" && required !== null) {
    return required.message;
  }
  return undefined;
}

/**
 * Retrieves the pattern from a RegexProperty if it is an object, otherwise returns the RegExp itself if it is a RegExp.
 * @param regex - The RegexProperty to extract the pattern from.
 * @returns The RegExp object if available, otherwise undefined.
 */
export function getRegexPattern(
  regex: RegexProperty | undefined,
): RegExp | undefined {
  if (regex instanceof RegExp) {
    return regex;
  } else if (typeof regex === "object" && regex !== null) {
    return regex.pattern;
  }
  return undefined;
}

/** 
 * Retrieves the message from a RegexProperty if it is an object, otherwise returns undefined.
 * @param rule - The RegexProperty to extract the message from.
 * @returns The message string if available, otherwise undefined.
 */
export function getRegexMessage(
  rule: RegexProperty | undefined,
): string | undefined {
  if (rule instanceof RegExp) {
    return undefined;
  }
  if (typeof rule === "object" && rule !== null) {
    return rule.message ?? "Invalid input.";
  }
  return "Invalid input.";
}
