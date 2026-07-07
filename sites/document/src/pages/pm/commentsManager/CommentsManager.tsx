import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Button, Combobox, Textarea, Textbox } from '@wps/input';
import { showNotification } from '@wps/layout';
import {
  createReviewPackage,
  createComment,
  deleteComment,
  deleteReviewPackage,
  fetchReviewPackages,
  fetchComments,
  updateComment,
} from './api';
import PackageSelection from './components/PackageSelection';
import NewPackage from './components/NewPackage';
import CommentEditor from './components/CommentEditor';
import { createPdfReport } from './components/createPDF';
import { COMMENT_STATUSES, Dates, REVIEW_PACKAGE_STATUSES, type CommentRecord, type CommentStatus, type ReviewPackage } from '@wps/scripts';
import { ListStart, Pencil, FileText, Save, X } from 'lucide-react';

type CommentForm = {
  id?: string;
  localId: string;
  commentId: string;
  department: string;
  comment: string;
  response: string;
  status: CommentStatus;
};

const defaultPackageStatus = REVIEW_PACKAGE_STATUSES[0];
const defaultCommentStatus = COMMENT_STATUSES[0];
const packageStatusOptions = REVIEW_PACKAGE_STATUSES.map((status) => ({
  key: status.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  value: status,
}));

type ReviewPackageForm = {
  projectNumber: string;
  projectName: string;
  municipalNumber: string;
  reviewNumber: string;
  reviewDate: string;
  completedBy: string;
  comment: string;
};

const emptyReviewPackageForm: ReviewPackageForm = {
  projectNumber: '',
  projectName: '',
  municipalNumber: '',
  reviewNumber: '',
  reviewDate: '',
  completedBy: '',
  comment: '',
};

export function CommentsManager() {
  const navigate = useNavigate();
  const { packageId } = useParams<{ packageId?: string }>();
  const { accounts } = useMsal();
  const editorName = accounts[0]?.name ?? accounts[0]?.username ?? 'unknown-user';

  const [reviewPackages, setReviewPackages] = useState<ReviewPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageForm, setPackageForm] = useState<ReviewPackageForm>(emptyReviewPackageForm);
  const [selectedPackage, setSelectedPackage] = useState<ReviewPackage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [editableComments, setEditableComments] = useState<CommentForm[]>([]);
  const [savingComments, setSavingComments] = useState(false);
  const [editsMade, setEditsMade] = useState(false);

  const [editingPackage, setEditingPackage] = useState(false);
  const [savingPackageEdits, setSavingPackageEdits] = useState(false);
  const [packageEditSnapshot, setPackageEditSnapshot] = useState<ReviewPackage | null>(null);

  const sortedComments = useMemo(() => {
    const savedOrder = [...comments].sort((a, b) => {
      const departmentA = a.department.trim();
      const departmentB = b.department.trim();
      const departmentAEmpty = departmentA.length === 0;
      const departmentBEmpty = departmentB.length === 0;

      if (departmentAEmpty !== departmentBEmpty) {
        return departmentAEmpty ? 1 : -1;
      }

      const departmentCompare = departmentA.localeCompare(departmentB, undefined, { sensitivity: 'base', numeric: true });
      if (departmentCompare !== 0) {
        return departmentCompare;
      }

      const commentIdCompare = a.commentId.trim().localeCompare(b.commentId.trim(), undefined, { sensitivity: 'base', numeric: true });
      if (commentIdCompare !== 0) {
        return commentIdCompare;
      }

      return a.id.localeCompare(b.id, undefined, { sensitivity: 'base', numeric: true });
    });

    const editableById = new Map(editableComments.filter((item) => item.id).map((item) => [item.id as string, item]));
    const orderedExisting = savedOrder
      .map((item) => editableById.get(item.id))
      .filter((item): item is CommentForm => Boolean(item));

    const unsavedNew = editableComments.filter((item) => !item.id);
    return [...orderedExisting, ...unsavedNew];
  }, [comments, editableComments]);

  const filteredPackages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return reviewPackages;
    }

    return reviewPackages.filter((item) => {
      return [item.projectNumber, item.projectName, item.municipalNumber, item.reviewNumber, item.reviewDate]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [reviewPackages, searchTerm]);

  useEffect(() => {
    document.title = 'Comments Manager - The Compass';

    if (packageId) {
      return;
    }

    setPackagesLoading(true);
    fetchReviewPackages()
      .then((packages) => {
        setReviewPackages(packages);
      })
      .catch((error) => {
        showNotification({
          title: 'Load Failed',
          body: String(error),
          style: 'danger',
        });
      })
      .finally(() => {
        setPackagesLoading(false);
      });
  }, [packageId]);

  useEffect(() => {
    if (!packageId) {
      setSelectedPackage(null);
      setPackageEditSnapshot(null);
      setEditingPackage(false);
      setComments([]);
      setEditableComments([]);
      setEditsMade(false);
      return;
    }

    fetchComments(packageId)
      .then((data) => {
        setSelectedPackage(data.package);
        setPackageEditSnapshot(null);
        setEditingPackage(false);
        setComments(data.comments || []);
        setEditableComments(
          (data.comments || []).map((entry) => ({
            id: entry.id,
            localId: entry.id,
            commentId: entry.commentId,
            department: entry.department,
            comment: entry.comment,
            response: entry.response,
            status: entry.status,
          }))
        );
        setEditsMade(false);
      })
      .catch((error) => {
        showNotification({
          title: 'Load Failed',
          body: String(error),
          style: 'danger',
        });
        navigate('/tools/comments-manager', { replace: true });
      });
  }, [navigate, packageId]);

  function onSelectPackage(nextPackageId: string) {
    navigate(`/tools/comments-manager/${nextPackageId}`);
  }

  function openCreatePackageView() {
    setPackageForm({
      ...emptyReviewPackageForm,
      completedBy: editorName,
    });
    setIsCreatingPackage(true);
  }

  function closeCreatePackageView() {
    setIsCreatingPackage(false);
  }

  function onPackageFormChange(field: keyof ReviewPackageForm, value: string) {
    setPackageForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateSelectedPackageField<K extends keyof ReviewPackage>(field: K, value: ReviewPackage[K]) {
    setSelectedPackage((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function savePackage() {
    const normalizedProjectNumber = packageForm.projectNumber.trim().toLowerCase();
    const normalizedReviewNumber = packageForm.reviewNumber.trim().toLowerCase();

    if (!normalizedProjectNumber) {
      showNotification({
        title: 'Missing Fields',
        body: 'Project number is required.',
        style: 'warning',
      });
      return;
    }

    if (!normalizedReviewNumber) {
      showNotification({
        title: 'Missing Fields',
        body: 'Review number is required.',
        style: 'warning',
      });
      return;
    }

    const hasDuplicate = reviewPackages.some((item) => {
      return item.projectNumber.trim().toLowerCase() === normalizedProjectNumber && item.reviewNumber.trim().toLowerCase() === normalizedReviewNumber;
    });

    if (hasDuplicate) {
      showNotification({
        title: 'Duplicate Review',
        body: 'A review package with this project number and review number already exists.',
        style: 'warning',
      });
      return;
    }

    setSavingPackage(true);

    try {
      const createdPackage = await createReviewPackage({
        projectNumber: packageForm.projectNumber.trim(),
        projectName: packageForm.projectName.trim(),
        municipalNumber: packageForm.municipalNumber.trim(),
        reviewNumber: packageForm.reviewNumber.trim(),
        reviewDate: packageForm.reviewDate,
        completedBy: packageForm.completedBy.trim() || editorName,
        comment: packageForm.comment.trim(),
        status: defaultPackageStatus,
        createdBy: editorName,
        updatedBy: editorName,
      });

      setReviewPackages((prev) => [createdPackage, ...prev]);
      setIsCreatingPackage(false);
      showNotification({
        title: 'Created',
        body: 'Review package created successfully.',
        style: 'success',
      });
      navigate(`/tools/comments-manager/${createdPackage.id}`);
    } catch (error) {
      showNotification({
        title: 'Save Failed',
        body: String(error),
        style: 'danger',
      });
    } finally {
      setSavingPackage(false);
    }
  }

  async function onDeletePackage(id: string) {
    try {
      await deleteReviewPackage(id);
      setReviewPackages((prev) => prev.filter((item) => item.id !== id));
      showNotification({
        title: 'Deleted',
        body: 'Review package deleted successfully.',
        style: 'success',
      });
    } catch (error) {
      showNotification({
        title: 'Delete Failed',
        body: String(error),
        style: 'danger',
      });
    }
  }

  function addQuickComment() {
    const localId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setEditableComments((prev) => [
      ...prev,
      {
        localId,
        commentId: '',
        department: '',
        comment: '',
        response: '',
        status: defaultCommentStatus,
      },
    ]);
    setEditsMade(true);
  }

  function updateEditableComment(localId: string, field: keyof CommentForm, value: string) {
    setEditableComments((prev) => prev.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)));
  }

  function removeEditableComment(localId: string) {
    setEditableComments((prev) => prev.filter((item) => item.localId !== localId));
    setEditsMade(true);
  }

  async function saveAllComments() {
    if (!selectedPackage) {
      showNotification({
        title: 'Package Required',
        body: 'Select a review package before saving comments.',
        style: 'warning',
      });
      return;
    }

    const invalidComment = editableComments.find((item) => !item.comment.trim());
    if (invalidComment) {
      showNotification({
        title: 'Missing Fields',
        body: 'Every comment entry must include comment text before saving.',
        style: 'warning',
      });
      return;
    }

    setEditsMade(false);
    setSavingComments(true);

    try {
      const baseById = new Map(comments.map((item) => [item.id, item]));
      const createPayloads = editableComments.filter((item) => !item.id);
      const editableIds = new Set(editableComments.map((item) => item.id).filter(Boolean));
      const deletePayloadIds = comments.filter((item) => !editableIds.has(item.id)).map((item) => item.id);
      const updatePayloads = editableComments.filter((item) => {
        if (!item.id) {
          return false;
        }

        const base = baseById.get(item.id);
        if (!base) {
          return true;
        }

        return (
          base.commentId !== item.commentId ||
          base.department !== item.department ||
          base.comment !== item.comment ||
          base.response !== item.response ||
          base.status !== item.status
        );
      });

      await Promise.all([
        ...updatePayloads.map((item) =>
          updateComment(item.id as string, {
            packageId: selectedPackage.id,
            commentId: item.commentId,
            department: item.department,
            comment: item.comment,
            response: item.response,
            status: item.status,
            updatedBy: editorName,
          })
        ),
        ...createPayloads.map((item) =>
          createComment({
            packageId: selectedPackage.id,
            commentId: item.commentId,
            department: item.department,
            comment: item.comment,
            response: item.response,
            status: item.status,
            createdBy: editorName,
            updatedBy: editorName,
          })
        ),
        ...deletePayloadIds.map((id) => deleteComment(id)),
      ]);

      if (packageId) {
        const refreshed = await fetchComments(packageId);
        setSelectedPackage(refreshed.package);
        setComments(refreshed.comments || []);
        setEditableComments(
          (refreshed.comments || []).map((entry) => ({
            id: entry.id,
            localId: entry.id,
            commentId: entry.commentId,
            department: entry.department,
            comment: entry.comment,
            response: entry.response,
            status: entry.status,
          }))
        );
      }

      setEditsMade(false);
      showNotification({
        title: 'Saved',
        body: 'All comment changes saved successfully.',
        style: 'success',
      });
    } catch (error) {
      showNotification({
        title: 'Save Failed',
        body: String(error),
        style: 'danger',
      });
    } finally {
      setSavingComments(false);
    }
  }

  if (!packageId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isCreatingPackage ? (
          <NewPackage
            form={packageForm}
            saving={savingPackage}
            onFormChange={onPackageFormChange}
            onSave={savePackage}
            onCancel={closeCreatePackageView}
          />
        ) : (
          <PackageSelection
            packages={filteredPackages}
            loadingPackages={packagesLoading}
            onFilterTextChange={setSearchTerm}
            onSelectPackage={onSelectPackage}
            onDeletePackage={onDeletePackage}
            onCreatePackage={openCreatePackageView}
          />
        )}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
		switch (status) {
			case 'open':
				return 'bg-green-800 text-white font-bold border border-green';
			case 'review':
				return 'bg-orange-600 text-white font-bold border border-orange';
			case 'closed':
				return 'bg-gray-800 text-white font-bold border border-gray';
			default:
				return 'bg-gray-800 text-white font-bold border border-gray';
		}
	};

	const getProperCasing = (status: string): string => {
		return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}

  async function handleChangePackageEdit(action: 'edit' | 'save' | 'cancel'): Promise<void> {
    if (action === 'edit') {
      setPackageEditSnapshot(selectedPackage ? { ...selectedPackage } : null);
      setEditingPackage(true);
      return;
    }

    if (action === 'cancel') {
      if (packageEditSnapshot) {
        setSelectedPackage(packageEditSnapshot);
      }
      setPackageEditSnapshot(null);
      setEditingPackage(false);
      return;
    }

    if (!selectedPackage) {
      return;
    }

    try {
      setSavingPackageEdits(true);
      const updatedPackage = await createReviewPackage({
        id: selectedPackage.id,
        projectNumber: selectedPackage.projectNumber.trim(),
        projectName: selectedPackage.projectName.trim(),
        municipalNumber: selectedPackage.municipalNumber.trim(),
        reviewNumber: selectedPackage.reviewNumber.trim(),
        reviewDate: selectedPackage.reviewDate,
        completedBy: selectedPackage.completedBy.trim(),
        comment: selectedPackage.comment.trim(),
        status: selectedPackage.status,
        createdBy: selectedPackage.createdBy,
        updatedBy: editorName,
      });

      setSelectedPackage(updatedPackage);
      setReviewPackages((prev) => prev.map((item) => (item.id === updatedPackage.id ? updatedPackage : item)));
      setPackageEditSnapshot(null);
      setEditingPackage(false);
      showNotification({
        title: 'Saved',
        body: 'Review package updated successfully.',
        style: 'success',
      });
    } catch (error) {
      showNotification({
        title: 'Save Failed',
        body: String(error),
        style: 'danger',
      });
    } finally {
      setSavingPackageEdits(false);
    }
  }

  return (
    !selectedPackage ? (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-600">Review package not found.</p>
      </div>
    ) : (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="pb-4">
          <div className='flex flex-col md:flex-row items-start justify-between gap-2 mb-2'>
            <div className='flex-col gap-1'>
              <div className='flex flex-col md:flex-row items-start md:items-center gap-2'>
                <h1 className='text-2xl'><strong>{selectedPackage.projectNumber} - {selectedPackage.projectName}</strong> Review #{selectedPackage.reviewNumber}</h1>
                {editingPackage ? (
                <Combobox
                  key={`package-status-${selectedPackage.id}`}
                  field="packageStatus"
                  label=""
                  selections={packageStatusOptions}
                  defaultIndex={REVIEW_PACKAGE_STATUSES.indexOf(selectedPackage.status)}
                  onValidChange={(_, value) => {
                    updateSelectedPackageField('status', value as ReviewPackage['status']);
                  }}
                  disabled={!editingPackage}
                />
                ) : (
                  <span className={`px-2 py-1 text-sm ${getStatusColor(selectedPackage.status)}`}>{getProperCasing(selectedPackage.status)}</span>
                )}
              </div>
              <p className='text-sm'>Package Created: {Dates.formatDate(selectedPackage.createdDate, "MM/dd/yyyy")} | Last Updated: {Dates.formatDate(selectedPackage.updatedDate, "MM/dd/yyyy")}</p>
            </div>
            <div className="flex gap-1">
              {editingPackage ? (
                <>
                  <button
                    title='Save Package Details'
                    className='p-2 text-black hover:text-blue-700 transition-colors duration-200 cursor-pointer'
                    onClick={() => { void handleChangePackageEdit('save'); }}
                  >
                    <Save className='h-6 w-6 dark:text-white' />
                  </button>
                  <button
                    title='Cancel Package Edits'
                    className='p-2 text-black hover:text-red-700 transition-colors duration-200 cursor-pointer'
                    onClick={() => { void handleChangePackageEdit('cancel'); }}
                  >
                    <X className='h-6 w-6 dark:text-white' />
                  </button>
                </>
              ) : (
                <>
                  <button
                    title='Return to Package Selection'
                    className='p-2 text-black hover:text-blue-700 transition-colors duration-200 cursor-pointer'
                    onClick={() => onSelectPackage('')}
                  >
                    <ListStart className='h-6 w-6 dark:text-white' />
                  </button>
                  <button
                    title='Edit Package Details'
                    className='p-2 text-black hover:text-blue-700 transition-colors duration-200 cursor-pointer'
                    onClick={() => { void handleChangePackageEdit('edit'); }}
                    disabled={savingPackageEdits}
                  >
                    <Pencil className='h-6 w-6 dark:text-white' />
                  </button>
                  <button
                    title='Print PDF Report'
                    className='p-2 text-black hover:text-blue-700 transition-colors duration-200 cursor-pointer'
                    onClick={() => {
                      if (!selectedPackage) {
                        showNotification({
                          title: 'Package Required',
                          body: 'Select a review package before exporting.',
                          style: 'warning',
                        });
                        return;
                      }

                      void createPdfReport(selectedPackage, sortedComments);
                    }}
                  >
                    <FileText className='h-6 w-6 dark:text-white' />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600'>
            <Textbox
              field="municipalNumber"
              label="Municipal Project Number"
              labelPosition='side'
              onValidChange={(_, value) => updateSelectedPackageField('municipalNumber', value)}
              defaultValue={selectedPackage.municipalNumber}
              disabled={!editingPackage}
            />
            <Textbox
              field="commentsReceived"
              label="Comments Received"
              labelPosition='side'
              type="date"
              onValidChange={(_, value) => updateSelectedPackageField('reviewDate', value)}
              defaultValue={selectedPackage.reviewDate}
              disabled={!editingPackage}
            />
            <Textbox
              field="reviewCompletedBy"
              label="Review Completed By"
              labelPosition='side'
              onValidChange={(_, value) => updateSelectedPackageField('completedBy', value)}
              defaultValue={selectedPackage.completedBy}
              disabled={!editingPackage}
            />
            <div className='md:col-span-3'>
              <Textarea
                field="packageComment"
                label="Package Comments"
                defaultValue={selectedPackage.comment}
                onValidChange={(_, value) => updateSelectedPackageField('comment', value)}
                disabled={!editingPackage}
              />
            </div>
          </div>
        </section>

        <section className="overflow-y-auto">
          <div className='flex flex-row justify-end gap-2 mb-2'>
            {editsMade && (
              <Button
                label={savingComments ? 'Saving...' : 'Save Changes'}
                style="primary"
                onClick={saveAllComments}
                properties={{ disabled: savingComments }}
              />
            )}
            <Button
              label="Add Comment"
              style="secondary"
              onClick={() => { addQuickComment(); setEditsMade(true); }}
            />
          </div>

          {sortedComments.length === 0 ? (
            <div className="p-4 text-center text-gray-600 border border-dashed border-gray-200">No comments loaded. Use Quick Add Comment to create one.</div>
          ) : (
            sortedComments.map((entry, index) => {
              const currentDepartment = entry.department.trim();
              const previousDepartment = index > 0 ? sortedComments[index - 1].department.trim() : null;
              const showDepartmentHeader = index === 0 || currentDepartment.toLowerCase() !== (previousDepartment || '').toLowerCase();

              return (
                <div key={entry.localId} className="">
                  {showDepartmentHeader && (
                    <div className="px-2 py-1 text-center bg-primary text-sm font-semibold text-white">
                      {currentDepartment ? `${currentDepartment} Department` : 'General Comments'}
                    </div>
                  )}

                  <div className="border border-gray-200">
                    <CommentEditor
                      form={entry}
                      onChange={(field, value) => updateEditableComment(entry.localId, field, value)}
                      onEdited={() => setEditsMade(true)}
                      onAdd={() => { addQuickComment(); setEditsMade(true); }}
                      onDelete={() => removeEditableComment(entry.localId)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    )
  );
}
