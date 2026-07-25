import {
  ColorClasses,
  ColorMode,
  RegexRule,
  RequiredRule,
} from "./commonTypes";

/**
 * Returns the full set of CSS classes for the given color mode and color classes. If the color mode is 'light', the light classes are returned; if 'dark', the dark classes are returned. If 'auto', all the dark classes are prepended with 'dark:' and merged with the light classes.
 * @param colorMode The color mode to use. Can be 'light', 'dark', or 'auto'.
 * @param colorClasses The color classes to use. Can be a string or a record of strings.
 * @returns A record of CSS classes for the given color mode and color classes.
 */
export function getFullColorClasses(
  colorMode: ColorMode,
  colorClasses: ColorClasses,
): string | Record<string, string> {
  const lightClasses = colorClasses.light;
  const darkClasses = colorClasses.dark;

  switch (colorMode) {
    case "light":
      return lightClasses;
    case "dark":
      return darkClasses;
    case "auto":
      if (typeof lightClasses === "string" && typeof darkClasses === "string") {
        return `${lightClasses} ${prefixClasses("dark", darkClasses)}`;
      }

      if (typeof lightClasses === "object" && typeof darkClasses === "object") {
        const autoClasses = Object.fromEntries(
          Object.entries(darkClasses).map(([key, value]) => [
            key,
            prefixClasses("dark", value),
          ]),
        );

        return { ...lightClasses, ...autoClasses };
      }

      throw new Error("Invalid color classes for auto mode.");
  }
}

/** Prefixes each class in the given string with the specified prefix. */
function prefixClasses(prefix: string, classes: string): string {
  return classes
    .trim()
    .split(/\s+/)
    .map((className) => `${prefix}:${className}`)
    .join(" ");
}

/** Checks if the field is required. */
export function isRequired(required: RequiredRule | undefined): boolean {
  return Boolean(required);
}

/** Gets the custom required message if the field is required and has a message. */
export function getRequiredMessage(
  required: RequiredRule | undefined,
): string | undefined {
  if (typeof required === "object" && required !== null) {
    return required.message ?? "This field is required.";
  }
  return "This field is required.";
}

/** Gets the regular expression from the rule if it exists. */
export function getRegex(rule: RegexRule | undefined): RegExp | undefined {
  if (rule instanceof RegExp) {
    return rule;
  }
  if (typeof rule === "object" && rule !== null) {
    return rule.pattern;
  }
  return undefined;
}

/** Gets the custom regular expression error message if it exists. */
export function getRegexMessage(
  rule: RegexRule | undefined,
): string | undefined {
  if (rule instanceof RegExp) {
    return undefined;
  }
  if (typeof rule === "object" && rule !== null) {
    return rule.message ?? "Invalid input.";
  }
  return "Invalid input.";
}
