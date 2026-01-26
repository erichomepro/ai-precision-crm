import { Activity, MailCheck, UserPlus, FileCheck } from "lucide-react";

export default function PulseFeed() {
    const events = [
        { icon: UserPlus, title: "New Lead Found", desc: "Beast Mode Contracting (4.2 stars)", time: "2m ago", color: "text-blue-400" },
        { icon: MailCheck, title: "Email Opened", desc: "John @ Homexx read your proposal", time: "15m ago", color: "text-green-400" },
        { icon: FileCheck, title: "Proposal Generated", desc: "Draft ready for review", time: "1h ago", color: "text-purple-400" },
        { icon: UserPlus, title: "New Lead Found", desc: "Edmonton Plumbing (3.8 stars)", time: "2h ago", color: "text-blue-400" },
    ];

    return (
        <div className="h-full bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-secondary" />
                <h2 className="text-sm font-semibold text-white">The Pulse</h2>
            </div>

            <div className="space-y-4">
                {events.map((event, i) => (
                    <div key={i} className="flex gap-3 relative">
                        {i !== events.length - 1 && (
                            <div className="absolute left-[9px] top-6 bottom-[-16px] w-[1px] bg-white/10" />
                        )}
                        <div className={`mt-0.5 ${event.color}`}>
                            <event.icon size={16} />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-white">{event.title}</div>
                            <div className="text-[10px] text-gray-400">{event.desc}</div>
                            <div className="text-[10px] text-gray-600 mt-0.5">{event.time}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
