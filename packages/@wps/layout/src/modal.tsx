import { Button } from '@wps/input';
import { X } from 'lucide-react';

export function Modal({
    title,
    isOpen,
    onAccept,
    onClose,
    size = 'md',
    acceptText = 'Accept',
    closeText = 'Close',
    showHeaderClose = true,
    showCloseButton = true,
    children
}: {
    title: string;
    isOpen: boolean;
    onAccept: () => void;
    onClose?: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
    acceptText?: string;
    closeText?: string;
    showHeaderClose?: boolean;
    showCloseButton?: boolean;
    children: React.ReactNode;
}) {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'w-full h-full'
    };

    return (
        <div>
            <dialog open={isOpen} onClose={() => { onClose?.(); }} className="">
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:px-6 z-50">
                    <div className={`bg-white rounded-lg shadow-lg p-6 w-full max-h-[calc(100vh-3rem)] overflow-y-auto sm:max-h-[calc(100vh-4rem)] ${sizeClasses[size]}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            {showHeaderClose && (
                                <button
                                    onClick={() => { onClose?.(); }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <div className="mb-4">
                            {children}
                        </div>
                        <div className="flex justify-end space-x-2">
                            {showCloseButton && (
                                <Button
                                    label={closeText}
                                    onClick={() => { onClose?.(); }}
                                    style="secondary"
                                    size="medium"
                                />
                            )}
                            <Button
                                label={acceptText}
                                onClick={() => { onAccept(); }}
                                style="primary"
                                size="medium"
                            />
                        </div>
                    </div>
                </div>
            </dialog>
        </div>
    )
}
