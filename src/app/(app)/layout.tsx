"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={showMobileMenu} setMobileOpen={setShowMobileMenu} />
      <div className="md:pl-[260px] transition-all duration-300">
        <Topbar onMenuClick={() => setShowMobileMenu(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
