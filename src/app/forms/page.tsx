"use client";

import Sidebar from "../components/Sidebar";
import FormBuilder from "../components/FormBuilder";

export default function FormsPage() {
    return (
        <div className="flex h-screen bg-[#020817] text-white overflow-hidden font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-white/10 flex items-center px-6 bg-[#020817]/50 backdrop-blur-md">
                    <div className="text-sm font-medium text-gray-400">Dashboard / <span className="text-white">Lead Forms</span></div>
                </header>
                <main className="flex-1 p-6">
                    <FormBuilder />
                </main>
            </div>
        </div>
    );
}
