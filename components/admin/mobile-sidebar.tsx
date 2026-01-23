"use client";

import { useState } from "react";
import { Menu, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="md:hidden">
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsOpen(true)}
            >
                <Menu className="h-6 w-6" />
            </Button>

            {/* Overlay & Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/80"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar Panel */}
                    <aside className="relative flex h-full w-64 flex-col border-r bg-background animate-in slide-in-from-left duration-300">
                        <div className="flex h-14 items-center justify-between border-b px-6 font-bold text-lg">
                            GeekFaka Admin
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <SidebarNav onNavigate={() => setIsOpen(false)} />
                        </div>

                        <div className="border-t p-4 shrink-0">
                            <a href="/api/admin/logout">
                                <Button variant="outline" className="w-full">
                                    <LogOut className="mr-2 h-4 w-4" /> 退出登录
                                </Button>
                            </a>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
