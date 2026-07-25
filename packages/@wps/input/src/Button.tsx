import React from "react";
import type { LucideIcon } from "lucide-react";
import { buttonClass, type InputColorMode } from "./styles";

/**
 * Optional button configuration for disabled state, color mode, and local class overrides.
 */
export interface ButtonProperties {
    disabled?: boolean;
    classNames?: string;

    title?: string;
    ariaLabel?: string;
}

/**
 * Dense industrial action button for shared White Point form and tool interfaces.
 * @param label - The text to display on the button.
 * @param style - The visual intent of the button.
 * @param size - The button size. Defaults to "medium".
 * @param colorMode - The target color mode for the control. Defaults to "light".
 * @param onClick - Optional click handler.
 */
export function Button({
    label,
    style,
    size,
    icon,
    colorMode,
    onClick,
    properties
}: {
    style: 'primary' | 'secondary' | 'danger' | 'success' | 'textonly';
    label?: string;
    size?: 'small' | 'medium' | 'large';
    icon?: LucideIcon;
    colorMode?: InputColorMode;
    onClick?: () => void;
    properties?: ButtonProperties;
}) : React.JSX.Element {
    const resolvedColorMode = colorMode ?? "light";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={properties?.disabled}
            className={buttonClass({ variant: style, size, colorMode: resolvedColorMode, className: properties?.classNames })}
            title={properties?.title}
            aria-label={properties?.ariaLabel ?? properties?.title ?? label}
        >
            {icon && React.createElement(icon, { className: "h-4.5 w-4.5" })}
            {label && <span>{label}</span>}
        </button>
    );
}
