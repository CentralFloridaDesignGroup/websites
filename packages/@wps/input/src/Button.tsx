import React, { useEffect } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Properties for the Button component, including disabled state and additional class names.
 * @param disabled - Whether the button is disabled.
 * @param classNames - Additional class names to apply to the button for custom styling.
 */
export interface ButtonProperties {
    disabled?: boolean;
    classNames?: string;
}

/* somethiong else to add here? maybe a type for the style prop? */

/**
 * Button component for rendering a styled button with various properties.
 * @param label - The text to display on the button.
 * @param style - The style of the button, which can be "primary", "secondary", or "danger".
 * @param size - The size of the button, which can be "small", "medium", or "large". Defaults to "medium".
 * @param onClick - An optional click handler function that is called when the button is clicked.
 * @param properties - An optional object containing additional properties for the button, such as disabled state and custom class names.
 * @returns A JSX element representing the button component.
 */
export function Button({
    label,
    style,
    size,
    icon,
    onClick,
    properties
}: {
    label: string;
    style: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'small' | 'medium' | 'large';
    icon?: LucideIcon;
    onClick?: () => void;
    properties?: ButtonProperties;
}) : React.JSX.Element {

    useEffect(() => {
        // This effect can be used for any side effects related to the button, such as logging or analytics.
    }, [label, style, properties]);
    
    const buttonSize = size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base';
    const baseClasses = "px-4 py-2 focus:outline-none transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed";
    const styleClasses = {
        primary: "bg-primary text-white hover:bg-primary-700 disabled:bg-primary-300 disabled:text-gray-500 dark:bg-primary-500 dark:hover:bg-primary-600 dark:disabled:bg-primary-300 dark:disabled:text-gray-500",
        secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-300 disabled:text-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:disabled:bg-gray-500",
        danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-gray-500 dark:bg-red-500 dark:hover:bg-red-600 dark:disabled:bg-red-300 dark:disabled:text-gray-500",
        success: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 disabled:text-gray-500 dark:bg-green-500 dark:hover:bg-green-600 dark:disabled:bg-green-300 dark:disabled:text-gray-500"
    };

    return (
        <button
            onClick={onClick}
            disabled={properties?.disabled}
            className={`${baseClasses} ${styleClasses[style]} ${buttonSize} ${properties?.classNames || ''}`}
        >
            {icon && React.createElement(icon, { className: "inline-block mr-2 h-4.5 w-4.5" })}
            <span>{label}</span>
        </button>
    );
}
