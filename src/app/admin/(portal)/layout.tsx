import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
