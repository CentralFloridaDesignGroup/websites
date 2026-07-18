import { Combobox, Textarea, Textbox } from '@wps/input';
import { X, Plus } from 'lucide-react';
import { COMMENT_STATUSES, type CommentStatus } from '@wps/scripts';

type CommentForm = {
    id?: string;
    commentId: string;
    department: string;
    comment: string;
    response: string;
    status: CommentStatus;
};

type CommentEditorProperties = {
    form: CommentForm;
    onChange: (field: keyof CommentForm, value: string) => void;
    onEdited: () => void;
    onAdd: () => void;
    onDelete: () => void;
};

export default function CommentEditor({ form, onChange, onEdited, onAdd, onDelete }: CommentEditorProperties) {
    const statusLabels: Record<CommentStatus, string> = {
        open: 'Open',
        closed: 'Closed',
        answered: 'Answered',
        'further information': 'Further Information',
        'not a comment': 'Not a Comment',
    };

    const statusBackgrounds: Record<CommentStatus, string> = {
        open: 'bg-red-100',
        closed: 'bg-gray-100',
        answered: '',
        "further information": 'bg-orange-100',
        'not a comment': 'bg-primary-100',
    };

    const statusSelections = COMMENT_STATUSES.map((status) => ({
        key: statusLabels[status],
        value: status,
    }));
    const statusDefaultIndex = COMMENT_STATUSES.findIndex((status) => status === form.status);

    return (
        <div className='p-2'>
            <div className='grid grid-cols-1 md:grid-cols-[1.5fr_2fr_2fr_auto] gap-2 items-start rounded p-2' key={form.id || 'new-comment'}>

                <div className='flex flex-col gap-1'>
                    <div>
                        <Textbox colorMode="auto"
                            field="commentId"
                            label="Comment #"
                            labelPosition='side'
                            defaultValue={form.commentId}
                            onValidChange={(_, value) => {
                                onChange('commentId', value);
                                onEdited();
                            }}
                        />
                    </div>

                    <div>
                        <Textbox colorMode="auto"
                            field="department"
                            label="Department"
                            labelPosition='side'
                            defaultValue={form.department}
                            onValidChange={(_, value) => {
                                onChange('department', value);
                                onEdited();
                            }}
                        />
                    </div>
                    <div>
                        <Combobox colorMode="auto"
                            field="status"
                            label="Status"
                            labelPosition='side'
                            selections={statusSelections}
                            defaultIndex={statusDefaultIndex >= 0 ? statusDefaultIndex : undefined}
                            onValidChange={(_, value) => {
                                onChange('status', value);
                                onEdited();
                            }}
                            props={{ inputClassNames: `${statusBackgrounds[form.status]}` }}
                        />
                    </div>
                </div>

                <div>
                    <Textarea colorMode="auto"
                        field="comment"
                        label="Comment"
                        defaultValue={form.comment}
                        onValidChange={(_, value) => {
                            onChange('comment', value);
                            onEdited();
                        }}
                    />
                </div>

                <div>
                    <Textarea colorMode="auto"
                        field="response"
                        label="Response"
                        defaultValue={form.response}
                        onValidChange={(_, value) => {
                            onChange('response', value);
                            onEdited();
                        }}
                    />
                </div>

                <div className="md:pt-8 flex flex-col justify-end">
                    <button
                        type="button"
                        title="Add comment"
                        aria-label="Add comment"
                        className="p-2 text-black hover:text-green-700 transition-colors duration-200 cursor-pointer"
                        onClick={onAdd}
                    >
                        <Plus className="h-5 w-5 dark:text-white" />
                    </button>
                    <button
                        type="button"
                        title="Delete comment"
                        aria-label="Delete comment"
                        className="p-2 text-black hover:text-red-700 transition-colors duration-200 cursor-pointer"
                        onClick={onDelete}
                    >
                        <X className="h-5 w-5 dark:text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}