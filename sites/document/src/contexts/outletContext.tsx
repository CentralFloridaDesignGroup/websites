import { createContext, ReactNode, useContext, useState } from "react";

export type OutletContextType = {
    sidebarItems: SidebarItem[];
    setSidebarItems: (items: SidebarItem[]) => void;
}

export interface SidebarItem {
    label: string | React.ReactNode;
    type: "link" | "header" | "divider" | "progress";
}

export interface SidebarLinkItem extends SidebarItem {
    type: "link";
    href: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    display?: "text" | "card";
}

export interface SidebarHeaderItem extends SidebarItem {
    type: "header";
    icon?: React.ReactNode;
}

export interface SidebarDividerItem extends SidebarItem {
    type: "divider";
}

export interface SidebarProgressGroup extends SidebarItem {
    type: "progress";
    currentId: string | number;
    sectionDisplay: string;
    items: {
        id: string;
        label: string | React.ReactNode;
        disabled?: boolean;
        onClick: () => void;
        icon?: React.ReactNode;
    }[];
}


const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider( { children }: { children: ReactNode }) {
    const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);

    const contextValue: OutletContextType = {
        sidebarItems,
        setSidebarItems
    };

    return (
        <OutletContext.Provider value={contextValue}>
            {children}
        </OutletContext.Provider>
    );
}

export function useSidebarContext() {
    const context = useContext(OutletContext);
    if (!context) {
        throw new Error("useSidebarContext must be used within an OutletProvider");
    }
    return context;
}