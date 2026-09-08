import { useEffect, useMemo, useState } from "react";
import {
  Combobox as HeadlessCombobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import {
  controlClass,
  errorClass,
  fieldShellClass,
  labelClass,
  menuClass,
  optionClass,
  type InputColorMode,
  type LabelPosition,
} from "./styles";

type SelectionOption = { key: string; value: string };

/**
 * Props for the shared dense combobox control.
 */
export interface ComboboxProperties {
  /** Field name used for ids, names, and validation callbacks. */
  field: string;
  /** Visible label text. When omitted, a screen-reader label is still rendered. */
  label?: string;
  /** Label placement relative to the input. Defaults to "top". */
  labelPosition?: LabelPosition;
  /** Options as either label/value records or key/value pairs. */
  selections: Record<string, unknown> | SelectionOption[];
  /** Controlled selected value. */
  value?: string;
  /** Disables the control. */
  disabled?: boolean;
  /** Marks the control as required. */
  required?: boolean;
  /** Placeholder text shown when no value is selected. */
  placeholder?: string;
  /** Zero-based selection index used for uncontrolled initialization. */
  defaultIndex?: number;
  /** Target color mode for the control. Defaults to "light". */
  colorMode?: InputColorMode;
  /** Renders the option list in a document-level portal so containing overflow does not clip it. */
  portal?: boolean;
  /** Maximum height for the options dropdown. Can be a CSS length value or a number of pixels. */
  maxOptionsHeight?: string | number;
  /** Called when the selected value changes. */
  onChange?: (field: string, value: string) => void;
  /** Called when the selected value passes validation. */
  onValidChange?: (field: string, value: string) => void;
  /** Called whenever validation is evaluated. */
  onValidReport?: (field: string, isValid: boolean) => void;
  /** Optional style overrides for combobox layout elements. */
  props?: {
    classNames?: string;
    inputClassNames?: string;
    optionsClassNames?: string;
  };
}

function normalizeSelections(
  selections: ComboboxProperties["selections"],
): SelectionOption[] {
  if (Array.isArray(selections))
    return selections.map((option) => ({
      key: option.key,
      value: String(option.value),
    }));
  return Object.entries(selections).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

/**
 * Dense industrial combobox using Headless UI with shared validation and color modes.
 */
export function Combobox({
  field,
  label,
  labelPosition = "top",
  selections,
  value,
  disabled,
  required,
  placeholder = "Select...",
  defaultIndex,
  colorMode = "light",
  maxOptionsHeight,
  portal = false,
  onChange,
  onValidChange,
  onValidReport,
  props,
}: ComboboxProperties): React.JSX.Element {
  const options = useMemo(() => normalizeSelections(selections), [selections]);
  const initialValue =
    defaultIndex !== undefined ? (options[defaultIndex]?.value ?? "") : "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedValue = value ?? internalValue;

  const resolvedMaxHeight =
    typeof maxOptionsHeight === "number"
      ? `${maxOptionsHeight}px`
      : maxOptionsHeight;
  const optionsStyle = resolvedMaxHeight
    ? ({
        "--combobox-options-max-height": resolvedMaxHeight,
      } as React.CSSProperties)
    : undefined;

  const selectedLabel = useMemo(() => {
    if (!selectedValue) return "";
    return options.find((option) => option.value === selectedValue)?.key ?? "";
  }, [options, selectedValue]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(
      (option) =>
        option.key.toLocaleLowerCase().includes(normalizedQuery) ||
        option.value.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  const validateSelection = (nextValue: string): boolean => {
    if (required && !nextValue) {
      setError("This field is required.");
      onValidReport?.(field, false);
      return false;
    }
    setError(null);
    onValidReport?.(field, true);
    return true;
  };

  const handleChange = (nextValue: string | null) => {
    const resolvedValue = nextValue ?? "";
    if (value === undefined) setInternalValue(resolvedValue);
    setQuery("");
    onChange?.(field, resolvedValue);
    if (validateSelection(resolvedValue)) onValidChange?.(field, resolvedValue);
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    if (!nextQuery) handleChange("");
  };

  useEffect(() => {
    if (value !== undefined) return;
    const nextValue =
      defaultIndex !== undefined ? (options[defaultIndex]?.value ?? "") : "";
    setInternalValue(nextValue);
    if (nextValue) {
      onChange?.(field, nextValue);
      if (validateSelection(nextValue)) onValidChange?.(field, nextValue);
    }
  }, [defaultIndex, options]);

  return (
    <div className={props?.classNames || ""}>
      <HeadlessCombobox
        as="div"
        value={selectedValue}
        onChange={handleChange}
        onClose={() => setQuery("")}
        disabled={disabled}
      >
        <div className={fieldShellClass(labelPosition)}>
          <label
            htmlFor={field}
            className={labelClass({
              colorMode,
              required,
              hidden: !label,
              labelPosition,
            })}
          >
            {label ?? field}
          </label>
          <div
            className={
              labelPosition === "side" ? "relative flex-1" : "relative"
            }
          >
            <ComboboxInput
              id={field}
              name={field}
              className={controlClass({
                colorMode,
                invalid: Boolean(error),
                disabled,
                className: `pr-8 ${props?.inputClassNames || ""}`,
              })}
              placeholder={placeholder}
              displayValue={() => selectedLabel}
              onChange={handleQueryChange}
              autoComplete="off"
            />
            <ComboboxButton
              className="absolute inset-y-0 right-0 flex items-center pr-2 disabled:hidden"
              disabled={disabled}
            >
              <ChevronDown
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </ComboboxButton>
            <ComboboxOptions
              transition
              portal={portal}
              anchor={portal ? "bottom start" : undefined}
              style={optionsStyle}
              className={menuClass(
                colorMode,
                `${portal ? "!z-[60] !w-[var(--input-width)]" : ""} ${maxOptionsHeight ? "!max-h-[var(--combobox-options-max-height)]" : ""} ${props?.optionsClassNames || ""}`,
              )}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <ComboboxOption
                    key={`${option.key}-${option.value}-${index}`}
                    value={option.value}
                    className={({ focus, selected }) =>
                      optionClass({ colorMode, focus, selected })
                    }
                  >
                    {option.key}
                  </ComboboxOption>
                ))
              ) : (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-500 dark:text-gray-400">
                  No matches found.
                </div>
              )}
            </ComboboxOptions>
          </div>
        </div>
      </HeadlessCombobox>
      {error ? (
        <p className={errorClass()} id={`${field}-error`}>
          <span className="font-medium">Error: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
