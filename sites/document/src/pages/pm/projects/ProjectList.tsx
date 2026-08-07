import { Combobox, Textbox } from 'cfdg/input'
import { type ProjectStatus } from 'cfdg/types'
import { type ProjectSummary } from '../../../api/projectManagement'
import { formatProjectStatus, projectStatusClassName } from './projectUtils'

type ProjectListProps = {
  projects: ProjectSummary[]
  loading: boolean
  searchTerm: string
  statusFilter: ProjectStatus | 'current' | 'all'
  selectedProjectId: string
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: ProjectStatus | 'current' | 'all') => void
  onSelectProject: (projectId: string) => void
}

export function ProjectList({ projects, loading, searchTerm, statusFilter, selectedProjectId, onSearchTermChange, onStatusFilterChange, onSelectProject }: ProjectListProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-grow flex-col md:flex-row md:justify-center items-end gap-3">
        <div className="grow-1 w-full">
          <Textbox field="project-search" label="Search Projects" colorMode="auto" value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="Project or client" />
        </div>
        <div className="grow-1 w-full">
          <div className="mt-2">
            <Combobox
              field="project-status-filter"
              label="Status"
              colorMode="auto"
              value={statusFilter}
              selections={[
                { key: 'Current Work', value: 'current' },
                { key: 'All Statuses', value: 'all' },
                { key: 'Proposal', value: 'proposal' },
                { key: 'Active', value: 'active' },
                { key: 'Hold', value: 'hold' },
                { key: 'Complete', value: 'complete' },
                { key: 'Cancelled', value: 'cancelled' },
              ]}
              onChange={(_, value) => onStatusFilterChange(value as ProjectStatus | 'current' | 'all')}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 max-h-[calc(100vh-15rem)] overflow-y-auto">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelectProject(project.id)}
            className={`mb-2 w-full rounded-md border p-3 text-left text-sm ${selectedProjectId === project.id ? 'border-primary bg-blue-50 dark:bg-blue-950' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{project.displayName}</p>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${projectStatusClassName(project.status)}`}>{formatProjectStatus(project.status)}</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{project.parentDisplayName || project.fullyQualifiedName || 'No parent client'}</p>
          </button>
        ))}
        {!loading && projects.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No projects found. Sync QBO customers from invoices settings.</p>}
      </div>
    </section>
  )
}

