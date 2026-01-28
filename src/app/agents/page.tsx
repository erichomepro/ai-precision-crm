"use client";
import Sidebar from "../components/Sidebar";

export default function AgentsPage() {
    return (
        <div className="flex h-screen bg-[#020817] text-white">
            <Sidebar />
            <div className="flex-1 p-8">
                <h1 className="text-2xl font-bold mb-4">Agent Workshop</h1>
                <p className="text-gray-400">Manage your agent swarm here.</p>
            </div>
        </div>
    );
}
