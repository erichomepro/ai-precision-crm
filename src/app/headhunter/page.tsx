"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from "../components/Sidebar";
import { db } from "../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc, deleteDoc, where } from "firebase/firestore";
import { Target, Calendar, Globe, User, ExternalLink, Briefcase, Plus, Search, Link as LinkIcon, CircuitBoard, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from "@/context/auth-context";

interface Candidate {
    name: string;
    role: string;
    linkedinUrl: string;
    // Enrichment Fields
    headline?: string;
    bio?: string;
    city?: string;
    country?: string;
    company?: string;
    isEnriched?: boolean;
    // Extended Data
    profilePic?: string;
    skills?: string[];
    connections?: number;
    education?: string[];
    // Step 3
    email?: string;
    phone?: string;
}

interface AuditReport {
    google?: {
        found: boolean;
        title?: string;
        totalScore?: number;
        reviewsCount?: number;
        isClaimed?: boolean;
    };
    tech?: {
        platform: string;
        hasFbPixel: boolean;
        hasChatbot: boolean;
        chatbotName?: string;
    };
    performance?: {
        performance: number;
        seo: number;
        mobileFriendly: boolean;
    };
    timestamp: string;
}

interface LogEntry {
    id: string;
    websiteUrl: string;
    timestamp: string;
    candidates: Candidate[];
    totalFound: number;
    businessName?: string;
    audit?: AuditReport;
}

import ScoutLauncher from "./ScoutLauncher";

export default function HeadHunterPage() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [enrichingMap, setEnrichingMap] = useState<Record<string, boolean>>({});
    const [auditingMap, setAuditingMap] = useState<Record<string, boolean>>({}); // NEW: Track audit state

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "headhunter_logs"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: LogEntry[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status !== 'Archived') {
                    fetchedLogs.push({ id: doc.id, ...data } as LogEntry);
                }
            });
            setLogs(fetchedLogs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const toggleExpand = (id: string) => {
        setExpandedLog(expandedLog === id ? null : id);
    };

    // --- Actions ---

    // NEW: Deep Audit Action
    const handleDeepAudit = async (logId: string, websiteUrl: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!websiteUrl) return;

        setAuditingMap(prev => ({ ...prev, [logId]: true }));

        try {
            console.log(`🚀 Starting Deep Audit for ${websiteUrl}...`);

            // 1. Parallel Execution of Agents
            // We use Promise.allSettled so if one fails, the others still return data.
            const [techRes, doctorRes] = await Promise.allSettled([
                fetch('/api/agents/tech', { method: 'POST', body: JSON.stringify({ websiteUrl }) }),
                fetch('/api/agents/doctor', { method: 'POST', body: JSON.stringify({ websiteUrl }) })
            ]);

            // 2. Process Results
            const auditData: AuditReport = { timestamp: new Date().toISOString() };

            if (techRes.status === 'fulfilled') {
                const data = await techRes.value.json();
                auditData.tech = data;
            }

            if (doctorRes.status === 'fulfilled') {
                const data = await doctorRes.value.json();
                auditData.performance = data;
            }

            // 3. Save to Firebase
            const logRef = doc(db, "headhunter_logs", logId);
            await updateDoc(logRef, { audit: auditData });

            // Local State Update (Optimistic)
            setLogs(prev => prev.map(log => log.id === logId ? { ...log, audit: auditData } : log));

        } catch (error) {
            console.error("Deep Audit Failed:", error);
            alert("Audit failed. Check console.");
        } finally {
            setAuditingMap(prev => ({ ...prev, [logId]: false }));
        }
    };

    const handleEnrich = async (logId: string, candidateIdx: number, candidate: Candidate) => {
        if (!candidate.linkedinUrl) {
            alert("No LinkedIn URL to enrich.");
            return;
        }

        const key = `${logId}-${candidateIdx}`;
        setEnrichingMap(prev => ({ ...prev, [key]: true }));

        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkedinUrl: candidate.linkedinUrl })
            });
            const data = await res.json();

            if (data.profile) {
                // Update Firestore Log Entry with Enriched Content
                const log = logs.find(l => l.id === logId);
                if (log) {
                    const updatedCandidates = [...log.candidates];
                    updatedCandidates[candidateIdx] = {
                        ...candidate,
                        name: `${data.profile.firstName || ""} ${data.profile.lastName || ""}`.trim() || candidate.name,
                        role: data.profile.title || candidate.role || "Unknown Role",
                        headline: data.profile.headline || null,
                        bio: data.profile.summary || null,
                        city: data.profile.city || null,
                        country: data.profile.countryCode || null,
                        company: data.profile.company || candidate.company || null,
                        isEnriched: true,
                        // New Fields
                        profilePic: data.profile.profilePic || null,
                        skills: data.profile.skills || [],
                        connections: data.profile.connections || 0,
                        education: data.profile.education || []
                    };

                    await updateDoc(doc(db, "headhunter_logs", logId), {
                        candidates: updatedCandidates
                    });
                }
            } else {
                alert(`Enrichment Failed: ${data.error || "Unknown Error"}`);
            }
        } catch (e: any) {
            console.error("Enrichment error", e);
            alert(`System Error: ${e.message}`);
        } finally {
            setEnrichingMap(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleRevealEmail = async (logId: string, candidateIdx: number, candidate: Candidate, websiteUrl: string) => {
        // We now require Name and Domain (derived from websiteUrl)
        if (!candidate.name || !websiteUrl) {
            alert("Need Name and Website Domain to find email.");
            return;
        }

        // Helper to clean domain (remove https, www, path)
        const cleanDomain = (url: string) => {
            try {
                const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
                return hostname.replace('www.', '');
            } catch (e) {
                return url;
            }
        };

        const domain = cleanDomain(websiteUrl);
        const nameParts = candidate.name.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        const key = `email-${logId}-${candidateIdx}`;
        setEnrichingMap(prev => ({ ...prev, [key]: true }));

        try {
            const res = await fetch('/api/reveal-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    domain
                })
            });
            const data = await res.json();

            if (data.email || data.phone) {
                // Update Firestore
                const log = logs.find(l => l.id === logId);
                if (log) {
                    const updatedCandidates = [...log.candidates];
                    updatedCandidates[candidateIdx] = {
                        ...candidate,
                        email: data.email || candidate.email,
                        phone: data.phone || candidate.phone
                    };

                    await updateDoc(doc(db, "headhunter_logs", logId), {
                        candidates: updatedCandidates
                    });
                }
            } else {
                alert("No contact info found (Email/Phone) for this profile.");
                console.log("Raw Contact Data:", data.raw);
            }
        } catch (e: any) {
            console.error("Contact reveal error", e);
            alert(`Contact Search Failed: ${e.message}`);
        } finally {
            setEnrichingMap(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleDeleteCandidate = async (logId: string, candidateIdx: number) => {
        if (!window.confirm("Delete this candidate from the staging area?")) return;

        try {
            const log = logs.find(l => l.id === logId);
            if (log) {
                const updatedCandidates = log.candidates.filter((_, idx) => idx !== candidateIdx);
                await updateDoc(doc(db, "headhunter_logs", logId), {
                    candidates: updatedCandidates
                });
            }
        } catch (e) {
            console.error("Deletion failed", e);
        }
    };

    const promoteToClient = async (candidate: Candidate, businessName: string = "Unknown Company", auditData?: AuditReport) => {
        const nameToUse = candidate.name === "Unknown Name" && candidate.linkedinUrl
            ? "LinkedIn Contact"
            : candidate.name;

        if (!window.confirm(`Promote ${nameToUse} to Client List?`)) return;

        try {
            const nameParts = nameToUse.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            await addDoc(collection(db, "clients"), {
                FirstName: firstName,
                LastName: lastName,
                Role: candidate.role,
                Status: "Scraped",
                Company: candidate.company || businessName,

                // Enriched Info
                LinkedinProfile: candidate.linkedinUrl,
                Headline: candidate.headline,
                Bio: candidate.bio,
                City: candidate.city,
                Country: candidate.country,
                IsEnriched: candidate.isEnriched || false,
                Email: candidate.email || null,
                Phone: candidate.phone || null,

                // Deep Audit Data
                Audit: auditData || null,

                createdAt: new Date().toISOString(),
                source: "Head Hunter Staging",
                userId: user?.uid // SCOPE TO USER
            });
            alert(`Succesfully moved ${nameToUse} to Client Manager!`);
        } catch (e) {
            console.error("Promotion failed", e);
            alert("Failed to promote.");
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!window.confirm("Archive this search result? (Removes from view)")) return;
        try {
            await updateDoc(doc(db, "headhunter_logs", logId), { status: "Archived" });
        } catch (e) {
            console.error("Archive log failed", e);
        }
    };

    return (
        <div className="flex h-screen bg-[#020817] text-white font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto relative">
                <div className="mb-8 border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Target size={32} className="text-secondary" />
                        Head Hunter Staging
                    </h1>
                    <p className="text-gray-400 mt-2">
                        <strong>Step 1</strong> results land here. <strong>Enrich (Step 2)</strong> to verify, then <strong>Promote</strong> to Client Manager.
                    </p>
                </div>

                <ScoutLauncher />

                {loading ? (
                    <div className="flex items-center justify-center h-64 border border-white/10 rounded-xl bg-white/5 animate-pulse">
                        <span className="text-gray-400">Syncing Staging Area...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10 border-dashed">
                        <Search size={48} className="mx-auto text-gray-500 mb-4" />
                        <h3 className="text-xl font-medium text-white">No Hunts on Record</h3>
                        <p className="text-gray-400 mt-2">Run the Head Hunter from the Company Manager to populate this staging area.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="bg-[#0B1221] border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-white/20">
                                {/* Header / Summary */}
                                <div
                                    onClick={() => toggleExpand(log.id)}
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white max-w-sm truncate">{log.websiteUrl}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(log.timestamp).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                <span className="text-secondary font-medium">{log.candidates?.length || 0} Profiles</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-gray-500 text-sm font-medium group-hover:text-white transition-colors">
                                            {expandedLog === log.id ? "Collapse" : "View Results"}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}
                                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition-colors"
                                            title="Archive Search"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedLog === log.id && (
                                    <div className="border-t border-white/10 bg-black/20 p-5">

                                        {/* DEEP AUDIT PANEL (New) */}
                                        <div className="mb-6 bg-[#0F172A] border border-blue-500/20 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-blue-400 font-bold flex items-center gap-2">
                                                    <CircuitBoard size={16} /> Deep Company Audit
                                                </h4>
                                                <button
                                                    onClick={(e) => handleDeepAudit(log.id, log.websiteUrl, e)}
                                                    disabled={auditingMap[log.id]}
                                                    className="bg-blue-600 hover:bg-blue-500 text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                                                >
                                                    {auditingMap[log.id] ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                                    {log.audit ? "Re-Run Audit" : "Run Deep Audit"}
                                                </button>
                                            </div>

                                            {log.audit ? (
                                                <div className="grid grid-cols-3 gap-4">
                                                    {/* Google Maps Card */}
                                                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                                                        <div className="text-gray-400 text-xs mb-1">Google Reputation</div>
                                                        {log.audit.google?.found ? (
                                                            <div>
                                                                <div className="text-2xl font-bold text-white flex items-center gap-1">
                                                                    {log.audit.google.totalScore} <span className="text-yellow-500 text-base">★</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500">{log.audit.google.reviewsCount} Reviews</div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 text-sm">Not found on Maps</div>
                                                        )}
                                                    </div>

                                                    {/* Tech Stack Card */}
                                                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                                                        <div className="text-gray-400 text-xs mb-1">Tech Stack</div>
                                                        {log.audit.tech ? (
                                                            <div className="space-y-1">
                                                                <div className="text-sm text-white font-medium">{log.audit.tech.platform}</div>
                                                                <div className="flex gap-2">
                                                                    {log.audit.tech.hasFbPixel && <span className="text-[10px] bg-blue-900/50 text-blue-200 px-1.5 rounded">Pixel</span>}
                                                                    {log.audit.tech.hasChatbot && <span className="text-[10px] bg-green-900/50 text-green-200 px-1.5 rounded">Chat: {log.audit.tech.chatbotName}</span>}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 text-sm">No Tech Data</div>
                                                        )}
                                                    </div>

                                                    {/* Performance Card */}
                                                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                                                        <div className="text-gray-400 text-xs mb-1">Site Health</div>
                                                        {log.audit.performance ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <div className={`text-lg font-bold ${log.audit.performance.performance >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                        {log.audit.performance.performance}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">Speed</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-lg font-bold text-white">
                                                                        {log.audit.performance.seo}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">SEO</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 text-sm">No Audit Data</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500 text-sm italic text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                                                    No audit run yet. Click "Run Deep Audit" to analyze this company.
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {log.candidates && log.candidates.length > 0 ? (
                                                log.candidates.map((candidate, idx) => {
                                                    const isEnriching = enrichingMap[`${log.id}-${idx}`];
                                                    return (
                                                        <div key={idx} className={`bg-[#111827] border ${candidate.isEnriched ? "border-green-500/20" : "border-white/10"} rounded-lg p-5 group hover:border-secondary/50 transition-colors relative flex flex-col h-full shadow-sm`}>

                                                            {/* Delete Button (Top Right) */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(log.id, idx); }}
                                                                className="absolute top-2 right-2 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                title="Delete Candidate"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>

                                                            {/* Card Header */}
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className={`w-12 h-12 rounded-full bg-white/5 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ${candidate.isEnriched ? "ring-2 ring-green-500/50" : "text-gray-300"}`}>
                                                                    {candidate.profilePic ? (
                                                                        <img src={candidate.profilePic} alt={candidate.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        candidate.name && candidate.name !== "Unknown Name" ? candidate.name[0] : <User size={20} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-bold text-white truncate text-base" title={candidate.name}>
                                                                            {candidate.name}
                                                                        </div>
                                                                        {candidate.isEnriched && <CheckCircle2 size={14} className="text-green-400" />}
                                                                    </div>

                                                                    <div className="text-xs text-gray-400 flex items-center gap-1 font-medium mt-0.5">
                                                                        <Briefcase size={10} className="text-secondary" />
                                                                        <span className="truncate">{candidate.role}</span>
                                                                    </div>

                                                                    {candidate.connections && candidate.connections > 0 && (
                                                                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                                            <User size={8} /> {candidate.connections} connections
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Details Section */}
                                                            <div className="flex-1 mb-4 space-y-3">
                                                                {/* LinkedIn URL Status */}
                                                                <div className="bg-black/40 rounded p-2 flex items-center justify-between">
                                                                    <span className="text-[10px] text-gray-500 uppercase font-bold">LinkedIn</span>
                                                                    {candidate.linkedinUrl ? (
                                                                        <a href={candidate.linkedinUrl} target="_blank" className="text-blue-400 hover:text-white transition-colors flex items-center gap-1 text-xs truncate max-w-[150px]" title={candidate.linkedinUrl}>
                                                                            <LinkIcon size={10} /> Open Link
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-600">Missing</span>
                                                                    )}
                                                                </div>

                                                                {/* Enriched Content Preview */}
                                                                {candidate.isEnriched ? (
                                                                    <div className="text-xs text-gray-300 space-y-1">
                                                                        <div className="font-medium text-white">{candidate.headline}</div>
                                                                        <div className="text-gray-500 flex items-center gap-1">
                                                                            <Globe size={10} />
                                                                            {[candidate.city, candidate.country].filter(Boolean).join(", ")}
                                                                        </div>

                                                                        {candidate.skills && candidate.skills.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                                {candidate.skills.slice(0, 3).map((skill, i) => (
                                                                                    <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400">
                                                                                        {skill}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Email Display */}
                                                                        {candidate.email && (
                                                                            <div className="mt-2 p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-200 flex items-center gap-2">
                                                                                <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                                                                                    <ExternalLink size={10} />
                                                                                </div>
                                                                                <span className="truncate select-all font-mono">{candidate.email}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Phone Display */}
                                                                        {candidate.phone && (
                                                                            <div className="mt-1 p-1.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-200 flex items-center gap-2">
                                                                                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                                                                    <CircuitBoard size={10} />
                                                                                </div>
                                                                                <span className="truncate select-all font-mono">{candidate.phone}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-gray-600 italic">
                                                                        Run enrichment to verify identity and location.
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions Footer */}
                                                            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/5">
                                                                {/* ENRICH BUTTON (STEP 2) */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEnrich(log.id, idx, candidate); }}
                                                                    disabled={candidate.isEnriched || isEnriching}
                                                                    className={`w-full py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                >
                                                                    {isEnriching ? <Loader2 size={12} className="animate-spin" /> : <CircuitBoard size={12} />}
                                                                    {isEnriching ? "..." : (candidate.isEnriched ? "Enriched" : "Enrich")}
                                                                </button>

                                                                {/* EMAIL REVEAL BUTTON (STEP 3) */}
                                                                {!candidate.email && candidate.isEnriched && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRevealEmail(log.id, idx, candidate, log.websiteUrl); }}
                                                                        disabled={enrichingMap[`email-${log.id}-${idx}`]}
                                                                        className={`col-span-2 w-full py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 hover:bg-yellow-500/20 disabled:opacity-50`}
                                                                    >
                                                                        {enrichingMap[`email-${log.id}-${idx}`] ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                                                        {enrichingMap[`email-${log.id}-${idx}`] ? "Searching..." : "Find Email"}
                                                                    </button>
                                                                )}

                                                                {/* PROMOTE BUTTON */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); promoteToClient(candidate, log.businessName || log.websiteUrl, log.audit); }}
                                                                    className={`${!candidate.email && candidate.isEnriched ? "col-span-1" : "col-span-2"} w-full py-2 bg-secondary text-black rounded text-xs font-bold transition-all flex items-center justify-center gap-1 hover:bg-secondary/90`}
                                                                >
                                                                    <Plus size={12} /> Add Lead
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-3 text-gray-500 text-sm font-medium py-4">
                                                    No results found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
