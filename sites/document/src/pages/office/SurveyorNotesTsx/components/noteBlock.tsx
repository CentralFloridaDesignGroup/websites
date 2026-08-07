import { useState } from 'react';
import { Button } from 'cfdg/input';
import { showNotification } from 'cfdg/layout';

export function NoteBlock({
    title,
    description,
    content,
    onExportChange
}: {
    title: string;
    description: string;
    content: string;
    onExportChange?: (include: boolean) => void;
}) {
    const [includeExport, setIncludeExport] = useState(false);

    return (
        <div className={`p-4 dark:bg-gray-800 ${includeExport ? 'border-2 border-green-500' : 'border-y border-primary'}`}>
            <div className="flex flex-col md:flex-row gap-2 mb-2 items-center justify-between">
                <h2 className="text-xl font-semibold grow text-center md:text-left">{title}</h2>
                <div className="grid grid-cols-2 gap-2">
                    <Button colorMode="auto"
                        style="secondary"
                        label="Copy Note"
                        onClick={() => {
                            navigator.clipboard.writeText(content);
                            showNotification({
                                title: 'Note Copied',
                                body: <p>Note <strong>{title}</strong> has been copied to your clipboard.</p>,
                                style: 'success'
                            });
                        }}
                    />
                    <Button colorMode="auto"
                        style={includeExport ? 'success' : 'primary'}
                        label={includeExport ? 'Remove from Export' : 'Include Export'}
                        onClick={() => {
                            setIncludeExport(prev => !prev);
                            onExportChange?.(!includeExport);
                        }}
                    />
                </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">{description}</p>
            <p className="border border-dashed border-primary dark:border-primary-500 p-2 whitespace-pre-wrap text-lg cursor-pointer dark:text-gray-300"
                onClick={() => {
                            navigator.clipboard.writeText(content);
                            showNotification({
                                title: 'Note Copied',
                                body: <p>Note <strong>{title}</strong> has been copied to your clipboard.</p>,
                                style: 'success'
                            });
                        }}>{content}</p>
        </div>
    );
}
