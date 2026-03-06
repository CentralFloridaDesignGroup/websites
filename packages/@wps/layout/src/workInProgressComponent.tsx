/**
 * A generic notice component to indicate that a page is a work in progress.
 * @returns JSX.Element
 */

export function WorkInProgressComponent() {
    return (
        <div className='space-y-1 bg-nile-blue-200 border-l-4 border-nile-blue-500 p-4 rounded-r-md screen-only'>
            <p className='font-semibold text-nile-blue'>Page is a Work in Progress:</p>
            <p className='text-nile-blue'>This page is in a work-in-progress state and is considered incomplete. User discresion is advised.</p>
        </div>
    )            
}