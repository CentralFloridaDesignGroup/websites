import { Fragment, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    SidebarItem, SidebarLinkItem, SidebarHeaderItem,
    SidebarDividerItem, SidebarProgressGroup
} from "../../../contexts/outletContext";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from '../../../auth/msalConfig'
import { ChevronDown } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { NotificationCard } from "@wps/layout";

export function CommonLayout() {
    const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
    const location = useLocation();

    const isAuthenticated = useIsAuthenticated();
    const { instance, accounts } = useMsal();
    const userId = accounts[0]?.homeAccountId ?? accounts[0]?.username ?? "anonymous";
    const recentStorageKey = `wps-document:recent:${userId}`;
    const [accountImageUrl, setAccountImageUrl] = useState<string | null>(null);
    const accountLabel = accounts[0]?.name ?? accounts[0]?.username;

    function normalizePaths(value: unknown): string[] {
        const items = Array.isArray(value) ? value : [];
        const unique = new Set<string>();

        for (const item of items) {
            const text = String(item ?? "").trim();
            if (!text || !text.startsWith("/")) {
                continue;
            }
            unique.add(text);
        }

        return Array.from(unique);
    }

    // Set global sidebar items based on the current route
    useEffect(() => {
        // to be reviewed.

    }, [location.pathname]);

    useEffect(() => {
        const currentPath = String(location.pathname ?? "").trim();
        if (!currentPath || currentPath === "/") {
            return;
        }

        const rawValue = localStorage.getItem(recentStorageKey);
        let existing: string[] = [];
        if (rawValue) {
            try {
                existing = normalizePaths(JSON.parse(rawValue));
            } catch {
                existing = [];
            }
        }
        const next = [currentPath, ...existing.filter((item) => item !== currentPath)].slice(0, 5);
        localStorage.setItem(recentStorageKey, JSON.stringify(next));
    }, [location.pathname, recentStorageKey]);

    useEffect(() => {
        let revokedUrl: string | null = null;

        async function loadPhoto() {
            if (!accounts[0]) return;

            const token = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });

            const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                headers: { Authorization: `Bearer ${token.accessToken}` },
            });

            // Profile photo may not exist for the user; treat 404 as "no photo".
            if (response.status === 404) {
                setAccountImageUrl(null);
                return;
            }

            if (!response.ok) {
                setAccountImageUrl(null);
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            revokedUrl = url;
            setAccountImageUrl(url);
        }

        loadPhoto().catch(() => setAccountImageUrl(null));

        return () => {
            if (revokedUrl) URL.revokeObjectURL(revokedUrl);
        };
    }, [accounts, instance]);

    function addSidebarLinkItem(item: SidebarLinkItem, index: number): React.ReactNode {
        return (
            <a
                key={index}
                href={item.href}
                onClick={item.onClick}
                className={`flex items-center mb-2 rounded-md cursor-pointer ${item.display === "card" ?
                    "bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 shadow hover:shadow-md font-semibold py-2 pl-3 mr-2" :
                    "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-1 mr-2"
                    }`}
            >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
            </a>
        );
    }

    function addSidebarHeaderItem(item: SidebarHeaderItem, index: number): React.ReactNode {
        return (
            <div key={index} className={`flex items-center p-2 mb-2 ${index !== 0 ? "mt-6" : ""} font-bold uppercase`}>
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
            </div>
        );
    }

    function addSidebarDividerItem(_: SidebarDividerItem, index: number): React.ReactNode {
        return (
            <hr key={index} className="my-4 border-gray-300 dark:border-gray-600" />
        );
    }

    /** Creates a sidebar progress group. The title turns into a HeaderItem, and each item is a link. If the index of the item is less than the currentItem, it is considered complete and shown as green. If the index is equal to the currentItem, it is considered active and shown as blue. */
    function addSidebarProgressGroup(item: SidebarProgressGroup, index: number): React.ReactNode {
        
        return (
            <Fragment key={index}>
                {/* Header entry */}
                <div className={`flex items-center p-2 mb-2 ${index !== 0 ? "mt-6" : ""} font-bold uppercase`}>
                    {item.sectionDisplay}
                </div>
                {/* Link entries */}
                {item.items.map((linkItem, linkIndex) => {
                    var status: "complete" | "active" | "upcoming" = "upcoming";
                    // The currentId can be either string or number, depending on how the consumer wants to identify the current item. We support both for flexibility, but it does add some complexity in determining the status of each item.
                    if (typeof item.currentId === "string") {
                        const currentIndex = item.items.findIndex(i => i.id === item.currentId);
                        if (linkIndex < currentIndex) {
                            status = "complete";
                        } else if (linkIndex === currentIndex) {
                            status = "active";
                        }
                    }
                    else {
                        if (linkIndex < (item.currentId as number)) {
                            status = "complete";
                        } else if (linkIndex === (item.currentId as number)) {
                            status = "active";
                        }
                    }
                    const baseClasses = "flex items-center mb-2 rounded-md cursor-pointer py-2 pl-3 mr-2";
                    const statusClasses = status === "complete" ? "bg-green-500 hover:bg-green-200 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold" :
                        status === "active" ? "bg-blue-200 hover:bg-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600 text-blue-800 dark:text-blue-200 font-semibold" :
                            "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 p-1";
                    const iconStatusClasses = status === "complete" ? "fill-white" :
                        status === "active" ? "stroke-[4px]" :
                            "";
                    return (
                        <div
                            key={linkItem.id}
                            onClick={linkItem.disabled ? undefined : linkItem.onClick}
                            className={`${baseClasses} ${statusClasses}`}
                        >
                            {linkItem.icon && <span className={`mr-2 ${iconStatusClasses}`}>{linkItem.icon}</span>}
                            {linkItem.label}
                        </div>
                    );
                })}
            </Fragment>
        )
    }

    function stringToColor(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = `hsl(${hash % 360}, 70%, 50%)`;
        return color;
    }

    function initials(name: string): string {
        const names = name.split(" ");
        const initials = names.map(n => n.charAt(0).toUpperCase()).join("");
        return initials.slice(0, 2); // Limit to 2 characters
    }

    function handleLogin() {
        instance.loginRedirect(loginRequest);
    };

    function handleLogout() {
        instance.logoutRedirect({
            postLogoutRedirectUri: window.location.origin,
        });
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden text-black dark:text-white bg-neutral-100 dark:bg-neutral-900">
            <NotificationCard />
            {!isAuthenticated && (
                <div className="w-full bg-blue-100 dark:bg-primary flex flex-row items-center justify-center px-4 py-2">
                    <p className="text-sm text-center text-blue-700 dark:text-blue-300 mr-4">You are viewing the public information resource version of this site. If you are an employee, please sign in to access the full features.</p>
                </div>
            )}
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 h-screen shrink-0 overflow-y-auto p-4 hidden md:block">
                    <Link
                        to="/"
                        className="text-2xl font-bold mb-6 block text-center"
                    >
                        <img src="/compass_Name.webp" alt="Compass Logo" className="w-full inline-block px-5 dark:hidden" />
                        <img src="/compass_Name_Dark.webp" alt="Compass Logo" className="w-full px-5 hidden dark:inline-block" />
                    </Link>
                    <nav className="flex flex-col h-[calc(100vh-9rem)] overflow-y-auto">
                        {sidebarItems.map((item, index) => (
                            (item.type === "link" && addSidebarLinkItem(item as SidebarLinkItem, index)) ||
                            (item.type === "header" && addSidebarHeaderItem(item as SidebarHeaderItem, index)) ||
                            (item.type === "divider" && addSidebarDividerItem(item as SidebarDividerItem, index)) ||
                            (item.type === "progress" && addSidebarProgressGroup(item as SidebarProgressGroup, index))
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 h-screen flex flex-col overflow-hidden">
                    <div className="shrink-0 flex items-center justify-end px-4">
                        {isAuthenticated ? (
                            <Menu>
                                <MenuButton className="px-1 py-1 my-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center cursor-pointer">
                                    <span className="font-semibold">{accountLabel}</span>
                                    {accountImageUrl ? (
                                        <img src={accountImageUrl} alt="Profile" className="h-8 w-8 rounded-full ml-2" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full ml-2 flex items-center justify-center" style={{ backgroundColor: stringToColor(accountLabel || "User") }}>
                                            <span className="text-sm font-semibold text-white">{initials(accountLabel || "User")}</span>
                                        </div>
                                    )}
                                    <ChevronDown className="ml-1" />
                                </MenuButton>
                                <MenuItems anchor="bottom end" className="w-[100px]">
                                    <MenuItem>
                                        <button
                                            onClick={handleLogout}
                                            className={`text-left px-4 py-2 w-[100px] dark:text-white data-focus:bg-gray-200 dark:data-focus:bg-gray-600 bg-white dark:bg-gray-700`}
                                        >
                                            Sign out
                                        </button>
                                    </MenuItem>
                                </MenuItems>
                            </Menu>
                        ) : (
                            <button
                                className="px-4 py-2 my-2 bg-primary rounded hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-white flex items-center cursor-pointer"
                                onClick={handleLogin}
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft Logo" className="h-5 w-auto inline-block mr-2" />
                                Sign in with Entra ID
                            </button>

                        )}
                    </div>
                    <div className="flex-1 min-h-0 p-4 overflow-y-auto">
                        <Outlet
                            context={{ sidebarItems, setSidebarItems }}
                        />
                    </div>
                </main>
            </div>
        </div>
    )
}

