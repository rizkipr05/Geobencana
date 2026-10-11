import { ReactNode } from "react";

export const metadata = {
  title: "DISASTRA — Admin Command Center",
  description: "AI-Powered Global Disaster Intelligence & Simulation Platform",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {children}
    </div>
  );
}
