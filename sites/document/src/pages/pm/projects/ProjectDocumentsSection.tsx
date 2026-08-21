import { Button } from 'cfdg/input'
import { type ProjectInvoiceDocument } from 'cfdg/types/v1'
import { Download, Trash2, Upload } from 'lucide-react'
import { formatFileSize, getDocumentUpdatedLabel } from './projectUtils'

type ProjectDocumentsSectionProps = {
  documents: ProjectInvoiceDocument[]
  documentBusy: boolean
  onUpload: (file: File | null) => void
  onDownload: (document: ProjectInvoiceDocument) => void
  onRemove: (document: ProjectInvoiceDocument) => void
}

export function ProjectDocumentsSection({ documents, documentBusy, onUpload, onDownload, onRemove }: ProjectDocumentsSectionProps) {
  return (
    <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Documents</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
          <Upload className="h-4 w-4" />
          Upload
          <input
            type="file"
            className="hidden"
            disabled={documentBusy}
            onChange={(event) => {
              onUpload(event.target.files?.[0] || null)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      {documents.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No project documents uploaded.</p>}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="rounded-md border border-gray-200 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{document.filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(document.sizeBytes)} - {document.contentType || 'file'}
                    {getDocumentUpdatedLabel(document) ? ` - ${getDocumentUpdatedLabel(document)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button label="Download" size="small" style="secondary" icon={Download} onClick={() => onDownload(document)} properties={{ disabled: documentBusy }} />
                  <Button label="Remove" size="small" style="danger" icon={Trash2} onClick={() => onRemove(document)} properties={{ disabled: documentBusy }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Invoice documents are attached automatically when this project's invoices are emailed. Contracts and other project documents can share this section later.</p>
    </div>
  )
}

