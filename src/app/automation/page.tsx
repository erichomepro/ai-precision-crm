"use client";
import Sidebar from "../components/Sidebar";

export default function AutomationPage() {
    return (
        <div className="flex h-screen bg-[#020817] text-white">
            <Sidebar />
            <div className="flex-1 p-8">
                <h1 className="text-2xl font-bold mb-4">Email Automation</h1>
                <p className="text-gray-400">Campaign sequences coming soon.</p>
            </div>
        </div>
    );
}
