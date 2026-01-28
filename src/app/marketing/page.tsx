"use client";

import Link from "next/link";
import { Search, PenTool, Share2, ArrowRight, Zap, LayoutDashboard, ArrowLeft } from "lucide-react";

export default function MarketingPage() {
    const agents = [
        {
            id: "analyst",
            name: "Brand Analyst",
            role: "DNA Extraction",
            description: "Analyzes company websites to extract tone, values, and branding pillars.",
            icon: Search,
            color: "from-blue-500 to-cyan-500",
            href: "/dashboard/marketing/analyst",
            stats: "Ready"
        },
        {
            id: "social",
            name: "Social Poster",
            role: "Content Generation",
            description: "Creates and schedules posts for Facebook, Instagram, and LinkedIn.",
            icon: Share2,
            color: "from-purple-500 to-pink-500",
            href: "/dashboard/marketing/social",
            stats: "7 Drafts"
        },
        {
            id: "blog",
            name: "Blog Writer",
            role: "Long-form Content",
            description: "Writes SEO-optimized articles based on your Brand DNA.",
            icon: PenTool,
            color: "from-orange-500 to-red-500",
            href: "/dashboard/marketing/blog",
            stats: "Idle"
        }
    ];

    return (
        <div className="min-h-screen bg-[#0B1221] text-white p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
                        Marketing Command Center
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Manage your brand's voice and generate high-converting content with your AI marketing team.
                    </p>
                </div>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl text-sm font-bold border border-white/5 transition-all text-gray-400 hover:text-white"
                >
                    <LayoutDashboard size={18} />
                    Back to Dashboard
                </Link>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <Link
                        key={agent.id}
                        href={agent.href}
                        className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10"
                    >
                        {/* Glow Effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl`} />

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${agent.color} bg-opacity-20`}>
                                    <agent.icon className="w-6 h-6 text-white" />
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/10 group-hover:border-white/20">
                                    {agent.stats}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                                {agent.name}
                            </h3>
                            <p className="text-sm text-secondary font-medium mb-3 uppercase tracking-wider text-xs opacity-80">
                                {agent.role}
                            </p>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                {agent.description}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center text-sm font-medium text-white/40 group-hover:text-white transition-colors">
                                Open Workspace <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Placeholder for future expansion */}
                <div className="border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-60 transition-opacity border-dashed">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-white/40" />
                    </div>
                    <h3 className="text-lg font-medium text-white/60">Add New Agent</h3>
                    <p className="text-sm text-gray-500 mt-1">Coming Soon</p>
                </div>
            </div>
        </div>
    );
}
