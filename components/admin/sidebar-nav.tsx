"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, FileText, Settings, BookOpen, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const routes = [
    {
        label: "仪表盘",
        icon: LayoutDashboard,
        href: "/admin",
        activeMatch: (pathname: string) => pathname === "/admin",
    },
    {
        label: "商品管理",
        icon: ShoppingBag,
        href: "/admin/products",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/products"),
    },
    {
        label: "分类管理",
        icon: Package,
        href: "/admin/categories",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/categories"),
    },
    {
        label: "订单列表",
        icon: FileText,
        href: "/admin/orders",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/orders"),
    },
    {
        label: "优惠码管理",
        icon: Ticket,
        href: "/admin/coupons",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/coupons"),
    },
    {
        label: "文章管理",
        icon: BookOpen,
        href: "/admin/articles",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/articles"),
    },
    {
        label: "系统设置",
        icon: Settings,
        href: "/admin/settings",
        activeMatch: (pathname: string) => pathname.startsWith("/admin/settings"),
    },
];

interface SidebarNavProps {
    className?: string;
    onNavigate?: () => void;
}

export function SidebarNav({ className, onNavigate }: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <nav className={cn("space-y-1 p-4", className)}>
            {routes.map((route) => (
                <Link key={route.href} href={route.href} onClick={onNavigate}>
                    <Button
                        variant={route.activeMatch(pathname) ? "secondary" : "ghost"}
                        className="w-full justify-start"
                    >
                        <route.icon className="mr-2 h-4 w-4" />
                        {route.label}
                    </Button>
                </Link>
            ))}
        </nav>
    );
}
