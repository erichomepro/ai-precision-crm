"use client";

import { useAuth } from "@/context/auth-context";
import { Sparkles, Users, MessageSquare, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const { user } = useAuth();

    const stats = [
        { label: "Active Leads", value: "24", icon: Users, color: "text-blue-400" },
        { label: "Blog Posts", value: "12", icon: MessageSquare, color: "text-purple-400" },
        { label: "Success Rate", value: "88%", icon: TrendingUp, color: "text-green-400" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-1000">
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">
                    Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">{user?.displayName || "Agent"}</span>
                </h1>
                <p className="text-gray-400">Here's what's happening with your marketing campaigns.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon size={64} />
                        </div>
                        <div className={`p-2 rounded-lg bg-white/5 inline-flex ${stat.color} mb-4`}>
                            <stat.icon size={20} />
                        </div>
                        <div className="text-3xl font-black">{stat.value}</div>
                        <div className="text-sm text-gray-500 font-bold uppercase tracking-widest">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-purple-600/20 to-transparent border border-purple-500/20 p-8 rounded-[40px] flex flex-col justify-between group min-h-[300px]">
                    <div>
                        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Autonomous Blog</h3>
                        <p className="text-gray-400 mb-6">Generate SEO-optimized articles and images in seconds with AI agents.</p>
                    </div>
                    <Link
                        href="/dashboard/marketing/blog"
                        className="inline-flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors group-hover:translate-x-1 duration-300"
                    >
                        Create Now <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 p-8 rounded-[40px] flex flex-col justify-between group min-h-[300px]">
                    <div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Campaign Scouter</h3>
                        <p className="text-gray-400 mb-6">Find high-intent leads and analyze competitors using stealth scouter agents.</p>
                    </div>
                    <Link
                        href="/dashboard/leads"
                        className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors group-hover:translate-x-1 duration-300"
                    >
                        Scan Leads <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
