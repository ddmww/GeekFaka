import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Package, FileText, Settings, LogOut, BookOpen, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "@/components/admin/mobile-sidebar";
import { SidebarNav } from "@/components/admin/sidebar-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await isAuthenticated();

  return (
    <div className="flex h-screen flex-col md:flex-row bg-background dark text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex shrink-0">
        <div className="flex h-14 items-center border-b px-6 font-bold text-lg">
          GeekFaka Admin
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-4 shrink-0">
          <a href="/api/admin/logout">
            <Button variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> 退出登录
            </Button>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center border-b p-4 md:hidden">
          <MobileSidebar />
          <span className="ml-4 font-bold text-lg">GeekFaka Admin</span>
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
