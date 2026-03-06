/**
 * A generic card button component for forms.
 * @param header - The header text of the card.
 * @param body - The body text of the card.
 * @param href - The URL to navigate to when the card is clicked.
 * @param icon - An optional icon to display alongside the header.
 * @returns React JSX Element representing the card button.
 */
export function CardButton({
    header,
    body,
    href,
    icon
}: {
    header: string;
    body: string;
    href: string;
    icon?: React.ReactNode;
}): React.JSX.Element {
    return (
        <a
            href={href}
            className="block border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition p-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
        >
            <div className="flex items-center mb-2">
                {icon && <div className="mr-2">{icon}</div>}
                <h3 className={`text-lg font-medium text-gray-900 dark:text-gray-100`}>{header}</h3>
            </div>
            <p className="text-sm text-gray-500 text-left dark:text-gray-300">{body}</p>
        </a>
    );
};