import { ChangeEvent, FocusEvent, useEffect, useState } from 'react';
import { Textbox } from '../core/textbox';
import type { TextboxProperties } from '../core/textbox';
import { classValueToString, getRegexMessage, getRegexPattern, getRequiredMessage, isRequired } from 'cfdg/scripts';
import type { ColorClassNamesFor, ColorMode } from 'cfdg/types/v2';

export type NorthstarTextboxProperties = TextboxProperties & {
    /** The name of the field. Should be unique */
    label?: string;
    /** The description of the field. */
    description?: string;
    /** The generic error message to display when the field is invalid. Specific error messages take precedence. */
    errorMessage?: string;
};



export function NorthstarTextbox(props: NorthstarTextboxProperties) {
    const [error, setError] = useState<string | null>(null);
    const [textCount, setTextCount] = useState<number>(typeof props.value === 'string' ? props.value.length : 0);

    const {
        label,
        description,
        errorMessage,
        className,
        colorMode = 'auto',
        required,
        regex,
        characterLimit,
        autoComplete,
        onChange,
        onBlur,
        ...rest
    } = props;

    const baseClasses = `block w-full border pl-2 cursor-edit disabled:cursor-not-allowed focus:outline-2 transition-colors ${typeof className === 'string' ? className : classValueToString(className?.light)}`;

    const inputClassName: ColorClassNamesFor<ColorMode> = {
        light: `${baseClasses} bg-transparent disabled:bg-gray-200 ${error ? 'border-red-500 focus:outline-red-500' : 'focus:outline-primary'}`,
        dark: `${baseClasses}`,
    };

    // Update the text count whenever the value prop changes
    useEffect(() => {
        setTextCount(typeof props.value === 'string' ? props.value.length : 0);
    }, [props.value]);

    /** 
     * Validates the input value based on the required and regex properties.
     * @param value - The input value to validate.
     * @param performRegexCheck - Whether to perform regex validation. Default is false.
     * @returns void
     */
    function validateInput(value: string, performRegexCheck: boolean = false) {
        setError(null); // Reset error state before validation

        if (isRequired(required) && !value) {
            const message = getRequiredMessage(required);
            setError(message ?? errorMessage ?? 'This field is required.');
            return; // Exit early if the field is required and empty
        }

        if (regex && performRegexCheck) {
            const pattern = getRegexPattern(regex);
            const message = getRegexMessage(regex);
            if (pattern) {
                pattern.lastIndex = 0; // Reset regex lastIndex in case of global regex
                if (!pattern.test(value)) {
                    setError(message ?? errorMessage ?? 'Invalid format.');
                    return; // Exit early if the regex validation fails
                }
            }
        }

        if (characterLimit && value.length > characterLimit) {
            setError(`Maximum character limit of ${characterLimit} exceeded.`);
            return; // Exit early if the character limit is exceeded
        }

        // If all validations pass, silently return without setting an error.
    }

    /**
     * Handles the input change event, validating the input value and invoking the onChange callback if provided.
     * @param event - The input change event.
     * @returns void
     * @comment This function does not perform regex validation on change to avoid unnecessary validation while the user is typing. Regex validation is performed on blur.
     */
    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { value } = event.target;
        validateInput(value, false); // Do not perform regex validation on change
        if (onChange) {
            onChange(event);
        }
    }

    /**
     * Handles the input blur event, validating the input value and invoking the onBlur callback if provided.
     * @param event - The input blur event.
     * @returns void
     */
    function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
        const { value } = event.target;
        validateInput(value, true); // Perform regex validation on blur
        if (onBlur) {
            onBlur(event);
        }
    }

    return (
        <div className="flex w-full flex-col gap-1">

            {/* Field Label */}
            {label && (
                <label
                    htmlFor={rest.field}
                    className="block text-start text-sm/6 font-medium text-gray-900 dark:text-gray-100"
                >
                    {label}
                    {isRequired(required) && <span className="ml-0.5 text-red-500">*</span>}
                </label>
            )}

            {/* Field Description */}
            {description && <p className="text-start text-sm text-gray-500 dark:text-gray-400">{description}</p>}

            {/* Input Field */}
            <Textbox
                {...rest}
                regex={regex}
                className={inputClassName}
                colorMode={colorMode}
                required={required}
                characterLimit={characterLimit}
                autoComplete={autoComplete || 'none'}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
            />

            {/* Text Limit helper */}
            {characterLimit && typeof props.value === 'string' && (
                <p className="text-start text-sm text-gray-500 dark:text-gray-400 text-end">
                    {textCount}/{characterLimit} characters
                </p>
            )}

            {/* Error message */}
            {error && (
                <p className="mt-0.5 text-start text-sm text-red-600 dark:text-red-400">
                    <span className="font-medium">Error: </span>{error}
                </p>
            )}
        </div>
    );
}
