import type { ColorMode, InputSize, ColorClasses, RequiredRule, RegexRule } from './commonTypes';

/** Props for the Textbox component */
export interface TextboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'required' | 'size'> {
    /** The name of the field. Always required and must be unique. */
    field: string;
    /** The color classes for the textbox. */
    classes?: ColorClasses;
    /** The size of the textbox. */
    size?: InputSize;
    /** The color mode of the textbox. */
    colorMode?: ColorMode;
    /** The label for the field. If not included, only the textbox and, if enabled, the error message is shown. */
    label?: string;
    /** Whether the field is required and an optional custom message. */
    required?: RequiredRule;
    /** A regular expression the field's value must match and an optional custom message. */
    regex?: RegexRule;
    /** Whether to show the error message. */
    showError?: boolean;
}

export function Textbox(props: TextboxProps) {

}