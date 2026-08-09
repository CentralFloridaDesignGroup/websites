import {
    Dialog,
    DialogBackdrop,
    DialogDescription,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(" ");
}

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

export interface ModalProperties {
    /** Whether the modal is visible. */
    open: boolean;
    /** Called when the modal requests to close. */
    onClose: () => void;
    /** Modal title announced to assistive technology and shown in the header. */
    title?: ReactNode;
    /** Optional supporting description below the title. */
    description?: ReactNode;
    /** Modal content. */
    children: ReactNode;
    /** Optional custom header content. Replaces title and description when provided. */
    header?: ReactNode;
    /** Optional footer content for actions. */
    footer?: ReactNode;
    /** Maximum modal width. Defaults to "md". */
    size?: ModalSize;
    /** Shows the header close button. Defaults to true. */
    showCloseButton?: boolean;
    /** Accessible label for the close button. */
    closeLabel?: string;
    /** Additional classes for the outer modal panel. */
    panelClassName?: string;
    /** Additional classes for the modal body. */
    bodyClassName?: string;
    /** Additional classes for the modal footer. */
    footerClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    full: "max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]",
};

/** Flexible shared modal shell with accessible focus, escape, and backdrop behavior. */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    header,
    footer,
    size = "md",
    showCloseButton = true,
    closeLabel = "Close dialog",
    panelClassName,
    bodyClassName,
    footerClassName,
}: ModalProperties) {
    const hasDefaultHeader = title !== undefined || description !== undefined;
    const hasHeader = header !== undefined || hasDefaultHeader || showCloseButton;

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-neutral-950/55" />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-start justify-center px-4 py-6 sm:items-center sm:px-6">
                    <DialogPanel
                        className={cx(
                            "w-full overflow-hidden rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-950 shadow-xl dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50",
                            SIZE_CLASSES[size],
                            panelClassName,
                        )}
                    >
                        {hasHeader && (
                            <div className="flex items-start justify-between gap-4 border-b border-neutral-300 px-5 py-4 dark:border-neutral-600">
                                <div className="min-w-0">
                                    {header ?? (
                                        <>
                                            {title !== undefined && (
                                                <DialogTitle className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                                                    {title}
                                                </DialogTitle>
                                            )}
                                            {description !== undefined && (
                                                <DialogDescription className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                                    {description}
                                                </DialogDescription>
                                            )}
                                        </>
                                    )}
                                </div>
                                {showCloseButton && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
                                        aria-label={closeLabel}
                                    >
                                        <X className="size-5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className={cx("px-5 py-5", bodyClassName)}>{children}</div>
                        {footer !== undefined && (
                            <div
                                className={cx(
                                    "border-t border-neutral-300 px-5 py-4 dark:border-neutral-600",
                                    footerClassName,
                                )}
                            >
                                {footer}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
