"use client";

import { useState } from "react";
import { LocateFixed, UserCheck, FileText, Search } from "lucide-react";

export default function SkillMarketplace() {
    const [agents, setAgents] = useState([
        {
            id: "scout",
            name: "The Scout",
            role: "Lead Discovery",
            desc: "Finds 'AI-Vulnerable' businesses on Google Maps.",
            icon: LocateFixed,
            active: true,
            color: "bg-blue-500",
        },
        {
            id: "headhunter",
            name: "The Headhunter",
            role: "Decision Maker Retrieval",
            desc: "Finds CEO/Owner emails via Hunter.io.",
            icon: UserCheck,
            active: false,
            color: "bg-purple-500",
        },
        {
            id: "closer",
            name: "The Closer",
            role: "Proposal Gen",
            desc: "Drafts hyper-personalized PDF proposals.",
            icon: FileText,
            active: false,
            color: "bg-green-500",
        },
        {
            id: "auditor",
            name: "The Auditor",
            role: "SEO Analytics",
            desc: "scans PageSpeed & SEO tags.",
            icon: Search,
            active: false,
            color: "bg-orange-500",
        },
    ]);

    const toggleAgent = (id: string) => {
        setAgents(agents.map(a =>
            a.id === id ? { ...a, active: !a.active } : a
        ));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Agent Workshop</h2>
                <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20">
                    {agents.filter(a => a.active).length} Active
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agents.map((agent) => (
                    <div
                        key={agent.id}
                        className={`p-3 rounded-lg border transition-all ${agent.active
                                ? "bg-white/5 border-secondary/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                : "bg-black/20 border-white/5 opacity-70 hover:opacity-100"
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-1.5 rounded-md ${agent.active ? agent.color + "/20 text-" + agent.color.split('-')[1] + "-400" : "bg-gray-800 text-gray-500"}`}>
                                <agent.icon size={16} />
                            </div>

                            <button
                                onClick={() => toggleAgent(agent.id)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${agent.active ? "bg-secondary" : "bg-gray-700"
                                    }`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${agent.active ? "left-4.5" : "left-0.5"
                                    }`} style={{ left: agent.active ? '18px' : '2px' }} />
                            </button>
                        </div>

                        <h3 className="text-sm font-medium text-white">{agent.name}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{agent.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
