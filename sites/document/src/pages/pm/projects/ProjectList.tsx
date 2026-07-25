import { Textbox } from '@wps/input'
import { type ProjectSummary } from '../../../api/projectManagement'

type ProjectListProps = {
  projects: ProjectSummary[]
  loading: boolean
  searchTerm: string
  selectedProjectId: string
  onSearchTermChange: (value: string) => void
  onSelectProject: (projectId: string) => void
}

export function ProjectList({ projects, loading, searchTerm, selectedProjectId, onSearchTermChange, onSelectProject }: ProjectListProps) {
  return (
    <section className="rounded-md border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Textbox field="project-search" label="Search Projects" colorMode="auto" value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="Project or client" />
      <div className="mt-3 max-h-[calc(100vh-15rem)] overflow-y-auto">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelectProject(project.id)}
            className={`mb-2 w-full rounded-md border p-3 text-left text-sm ${selectedProjectId === project.id ? 'border-primary bg-blue-50 dark:bg-blue-950' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700'}`}
          >
            <p className="font-semibold">{project.displayName}</p>
            <p className="text-gray-600 dark:text-gray-400">{project.parentDisplayName || project.fullyQualifiedName || 'No parent client'}</p>
          </button>
        ))}
        {!loading && projects.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No projects found. Sync QBO customers from invoices settings.</p>}
      </div>
    </section>
  )
}

