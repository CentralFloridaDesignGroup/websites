export type OutletContext = {
    sidebarItems: SidebarItem[];
    setSidebarItems: (items: SidebarItem[]) => void;
}

export interface SidebarItem {
    label: string | React.ReactNode;
}

export interface SidebarLinkItem extends SidebarItem {
    href: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    display?: "text" | "card";
}

export interface SidebarHeaderItem extends SidebarItem {
    icon?: React.ReactNode;
}