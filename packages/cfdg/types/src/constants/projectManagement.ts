/** Entra group object IDs allowed to use Project Management tools. Add IDs here as access expands. */
export const PROJECT_MANAGEMENT_ALLOWED_GROUP_IDS: string[] = [
    "1cb77436-5086-490c-8b77-49056339667b", // Accounting Access
    "51ad0458-eb18-4f00-a829-6e8b6d4636e6" // Managers
];

// TODO: Convert to an array of groups
/** Entra group object ID for users eligible to be assigned as internal project managers. */
export const PROJECT_MANAGER_GROUP_ID = '51ad0458-eb18-4f00-a829-6e8b6d4636e6';

/** Fallback Entra group display name used when PROJECT_MANAGER_GROUP_ID is not configured. */
export const PROJECT_MANAGER_GROUP_DISPLAY_NAME = 'Project Manager';

/** Valid Compass lifecycle statuses for QuickBooks-backed projects. */
export const PROJECT_STATUSES = ['proposal', 'active', 'hold', 'complete', 'cancelled'] as const;

/** Project statuses considered current work in Compass list views. */
export const CURRENT_PROJECT_STATUSES = ['proposal', 'active', 'hold'] as const;
