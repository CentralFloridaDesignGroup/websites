import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type NotificationStyle = 'success' | 'warning' | 'danger' | 'info';

type NotificationItem = {
	id: string;
	title: string;
	body: React.ReactNode;
	style: NotificationStyle;
};

export type ShowNotificationOptions = {
	title: string;
	body: string | React.ReactNode;
	style?: NotificationStyle;
	duration?: number;
};

const listeners = new Set<(items: NotificationItem[]) => void>();
let notifications: NotificationItem[] = [];

const colorMap: Record<NotificationStyle, string> = {
	success: 'border-green-500',
	warning: 'border-amber-500',
	danger: 'border-red-500',
	info: 'border-primary-700'
};

function emitNotifications() {
	for (const listener of listeners) {
		listener([...notifications]);
	}
}

export function closeNotification(id: string) {
	notifications = notifications.filter((item) => item.id !== id);
	emitNotifications();
}

/**
 * Adds a notification card to the screen with the specified options. The notification will automatically disappear after the specified duration (default is 5 seconds). If duration is set to 0, the notification will remain until manually closed.
 * @param title The title of the notification.
 * @param body The body content of the notification, which can be a string or any React node.
 * @param style The style theme of the notification, which can be 'success', 'warning', 'danger', or 'info'. Default is 'info'.
 * @param duration The duration in seconds for which the notification should be displayed. Default is 5 seconds. Set to 0 for persistent notifications. 
 * @returns The ID of the created notification.
 */
export function showNotification(options: ShowNotificationOptions) {
	const { title, body, style = 'info', duration = 5 } = options;
	const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

	notifications = [...notifications, { id, title, body, style },];
	emitNotifications();

	if (duration > 0) {
		setTimeout(() => {
			closeNotification(id);
		}, duration * 1000);
	}

	return id;
}

export function NotificationCard() {
	const [items, setItems] = useState<NotificationItem[]>([]);

	useEffect(() => {
		listeners.add(setItems);
		setItems([...notifications]);

		return () => {
			listeners.delete(setItems);
		};
	}, []);

	return (
		<div className="fixed top-4 inset-x-4 z-5000 space-y-2 pointer-events-none sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm">
			{items.map((item) => (
				<article
					key={item.id}
					className={`pointer-events-auto border border-l-4 bg-white dark:bg-gray-700 p-2 shadow-md ${colorMap[item.style]}`}
				>
					<div className="flex items-start justify-between gap-1">
						<div className="space-y-1">
							<p className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</p>
							<div className="text-sm text-gray-700 dark:text-gray-300">{item.body}</div>
						</div>
						<button
							type="button"
							className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 cursor-pointer"
							onClick={() => {
								closeNotification(item.id);
							}}
							aria-label="Close notification"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</article>
			))}
		</div>
	);
}
