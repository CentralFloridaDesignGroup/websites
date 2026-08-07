import { cx, type InputColorMode } from "./styles";

/**
 * Props for a dense internal card-style action link.
 */
export interface CardButtonProperties {
    /** Card heading. */
    header: string;
    /** Card body copy. */
    body: string;
    /** Link destination. */
    href: string;
    /** Optional leading icon. */
    icon?: React.ReactNode;
    /** Target color mode for the control. Defaults to "light". */
    colorMode?: InputColorMode;
}

/**
 * Dense industrial card action for form and tool navigation.
 */
export function CardButton({
    header,
    body,
    href,
    icon,
    colorMode = "light"
}: CardButtonProperties): React.JSX.Element {
    return (
        <a
            href={href}
            className={cx(
                "block border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/35",
                colorMode === "dark" ? "border-gray-700 bg-gray-800 hover:bg-gray-700" : colorMode === "auto" ? "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700" : "border-gray-200 bg-white hover:bg-gray-50"
            )}
        >
            <div className="mb-2 flex items-center">
                {icon ? <div className="mr-2">{icon}</div> : null}
                <h3 className={cx("text-lg font-medium", colorMode === "dark" ? "text-gray-100" : colorMode === "auto" ? "text-gray-900 dark:text-gray-100" : "text-gray-900")}>{header}</h3>
            </div>
            <p className={cx("text-left text-sm", colorMode === "dark" ? "text-gray-300" : colorMode === "auto" ? "text-gray-500 dark:text-gray-300" : "text-gray-500")}>{body}</p>
        </a>
    );
}
