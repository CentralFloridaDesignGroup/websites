import { useState } from 'react';
import { Button, Textbox } from 'cfdg/input';
import { CircleX, Folder, FolderOpen } from 'lucide-react';
import { Modal } from 'cfdg/layout';
import { Dates } from 'cfdg/scripts';
import { type ReviewPackage } from 'cfdg/types';

type ReviewPackageProperties = {
	packages: ReviewPackage[];
	loadingPackages: boolean;
	onSelectPackage: (packageId: string) => void;
	onDeletePackage: (packageId: string) => void;
	onFilterTextChange: (value: string) => void;
	onCreatePackage: () => void;
}

export default function PackageSelection(ReviewPackageProperties: ReviewPackageProperties) {
	return (
		<div className="max-w-7xl mx-auto pt-6">
			<h1 className="text-3xl font-bold mb-2">Comments Manager</h1>
			<p className="text-gray-700 mb-6 dark:text-white">Select a review package to manage comments or create a new package.</p>
			<div className='pb-4 border-b border-primary space-y-4'>
				<div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
					<h2 className='text-xl font-semibold'>Review Packages</h2>
					<Button colorMode="auto" label="Create Review Package" style="primary" onClick={ReviewPackageProperties.onCreatePackage} />
				</div>
				<Textbox colorMode="auto"
					field="search"
					label="Filter Packages"
					labelPosition='side'
					onValidChange={(_, value) => { ReviewPackageProperties.onFilterTextChange(value); }}
					placeholder='Search for any value in project number, name, municipal number, or review number'
				/>
			</div>
			{
				ReviewPackageProperties.loadingPackages ? (
					<div className="p-4 text-center text-gray-600">Loading review packages...</div>
				) : ReviewPackageProperties.packages.length === 0 ? (
					<div className="p-4 text-center text-gray-600">No review packages found.</div>
				) : (
					<div className=''>
						{ReviewPackageProperties.packages
							.sort((a, b) => a.projectNumber.localeCompare(b.projectNumber))
							.map((reviewPackage, index, sortedPackages) => (
								<div key={reviewPackage.id}>
									<PackageItem reviewPackage={reviewPackage} onSelect={ReviewPackageProperties.onSelectPackage} onDelete={ReviewPackageProperties.onDeletePackage} />
									{index < sortedPackages.length - 1 && <hr className="border-gray-200 border-dashed" />}
								</div>
							))}
					</div>
				)
			}
		</div >
	);
}

function PackageItem({ reviewPackage, onSelect, onDelete }: { reviewPackage: ReviewPackage; onSelect: (packageId: string) => void; onDelete: (packageId: string) => void }) {
	const [showDeleteModal, setShowDeleteModal] = useState(false);

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

	return (
		<>
			<div className='p-4 flex flex-col md:flex-row items-center justify-between'>
				<div className='flex-col gap-1'>
					<p><span className={`px-2 py-1 text-sm ${getStatusColor(reviewPackage.status)}`}>{getProperCasing(reviewPackage.status)}</span> <span className='text-lg font-bold'>{reviewPackage.projectNumber} {reviewPackage.projectName}</span> Review #{reviewPackage.reviewNumber}</p>
					<p className=''>Municipal #: {reviewPackage.municipalNumber} | Comments Received: {Dates.formatDate(reviewPackage.reviewDate, "MM/dd/yyyy")}</p>
					<p className=''>Review Completed By: {reviewPackage.completedBy}</p>
					<div className='flex flex-row gap-2 mt-1'>
						<p className='text-sm text-green-800 rounded-sm shrink-0'>Created {Dates.formatDate(reviewPackage.createdDate, "MM/dd/yyyy")}</p>
						<p className='text-sm text-gray-600'> | </p>
						<p className='text-sm text-blue-800 rounded-sm shrink-0'>Last updated {Dates.formatDate(reviewPackage.updatedDate, "MM/dd/yyyy")}</p>
					</div>
				</div>
				<div className='flex gap-2'>
					<button
						title='Open package'
						className='group p-2 text-black hover:text-primary transition-colors duration-200 cursor-pointer'
						onClick={() => onSelect(reviewPackage.id)}
					>
						<Folder className='h-6 w-6 group-hover:hidden dark:text-white' />
						<FolderOpen className='h-6 w-6 hidden group-hover:block dark:text-white' />
					</button>
					<button
						title='Delete package'
						className='p-2 text-black hover:text-red-700 transition-colors duration-200 cursor-pointer'
						onClick={() => setShowDeleteModal(true)}
					>
						<CircleX className='h-6 w-6 dark:text-white' />
					</button>
				</div>
			</div>

			<Modal
				title='Delete Review Package'
				isOpen={showDeleteModal}
				acceptText='Delete'
				closeText='Cancel'
				size='sm'
				onAccept={() => { onDelete(reviewPackage.id); setShowDeleteModal(false); }}
				onClose={() => setShowDeleteModal(false)}
			>
				<p className='text-sm text-gray-700'>
					Are you sure you want to delete <span className='font-semibold'>{reviewPackage.projectNumber} {reviewPackage.projectName}</span> (Review #{reviewPackage.reviewNumber})? This action cannot be undone.
				</p>
			</Modal>
		</>
	)
}