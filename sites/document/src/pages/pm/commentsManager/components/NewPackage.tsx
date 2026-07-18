import { Button, Textarea, Textbox } from '@wps/input';

type ReviewPackageForm = {
    projectNumber: string;
    projectName: string;
    municipalNumber: string;
    reviewDate: string;
    reviewNumber: string;
    completedBy: string;
    comment: string;
};

type NewPackageProperties = {
    form: ReviewPackageForm;
    saving: boolean;
    onFormChange: (field: keyof ReviewPackageForm, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
};

export default function NewPackage({ form, saving, onFormChange, onSave, onCancel }: NewPackageProperties) {
    return (
        <section className="max-w-3xl mx-auto mt-6 border border-gray-200 p-4 space-y-4">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">New Review Package</h2>
                <p className="text-sm text-gray-600">Enter the review package details below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Textbox colorMode="auto"
                    field="projectNumber"
                    label="Project Number"
                    required
                    defaultValue={form.projectNumber}
                    onValidChange={(_, value) => onFormChange('projectNumber', value)}
                />


                <Textbox colorMode="auto"
                    field="reviewNumber"
                    label="Review Number"
                    required
                    defaultValue={form.reviewNumber}
                    onValidChange={(_, value) => onFormChange('reviewNumber', value)}
                />

                <div className='md:col-span-2'>
                    <Textbox colorMode="auto"
                        field="projectName"
                        label="Project Name"
                        defaultValue={form.projectName}
                        onValidChange={(_, value) => onFormChange('projectName', value)}
                    />
                </div>

                <div className='md:col-span-2'>
                    <Textbox colorMode="auto"
                        field="municipalNumber"
                        label="Municipal Project Number"
                        defaultValue={form.municipalNumber}
                        onValidChange={(_, value) => onFormChange('municipalNumber', value)}
                    />
                </div>

                <div className='md:col-span-2'>
                    <Textbox colorMode="auto"
                        field="completedBy"
                        label="Completed By"
                        defaultValue={form.completedBy}
                        onValidChange={(_, value) => onFormChange('completedBy', value)}
                    />
                </div>

                <div className='md:col-span-2'>

                    <Textbox colorMode="auto"
                        field="reviewDate"
                        label="Review Date"
                        type="date"
                        defaultValue={form.reviewDate}
                        onValidChange={(_, value) => onFormChange('reviewDate', value)}
                    />
                </div>

                <div className='md:col-span-4'>
                    <Textarea colorMode="auto"
                        field="comment"
                        label="Comment"
                        defaultValue={form.comment}
                        onValidChange={(_, value) => onFormChange('comment', value)}
                    />
                </div>

            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button colorMode="auto" label="Cancel" style="secondary" onClick={onCancel} />
                <Button colorMode="auto"
                    label={saving ? 'Saving...' : 'Save and Open'}
                    style="primary"
                    onClick={onSave}
                    properties={{ disabled: saving }}
                />
            </div>
        </section>
    );
}
