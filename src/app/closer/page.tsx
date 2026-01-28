"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from "../components/Sidebar";
import { db } from "../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc, where } from "firebase/firestore";
import { Handshake, FileText, Send, CheckCircle2, Loader2, Download, CloudUpload, Trash2 } from 'lucide-react';
import { useAuth } from "@/context/auth-context";
import { SERVICE_CATALOG } from "./services";

interface Client {
    id: string;
    FirstName: string;
    LastName: string;
    Company: string;
    Role: string;
    Email: string;
    Source?: "Client" | "Lead"; // New Field
    [key: string]: any;
}

export default function CloserPage() {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set(SERVICE_CATALOG.map(s => s.name)));

    // Status States
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!user) return;

        // 1. Fetch CLIENTS
        const qClients = query(
            collection(db, "clients"),
            where("userId", "==", user.uid),
            limit(50)
        );

        const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
            const clientsFetched: Client[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.Status === 'Archived') return;
                clientsFetched.push({
                    id: doc.id,
                    FirstName: data.FirstName || "Unknown",
                    LastName: data.LastName || "",
                    Company: data.Company || "Unknown Company",
                    Role: data.Role || "Owner",
                    Email: data.Email || "",
                    City: data.City || "",
                    Website: data.Website || data.LinkedinProfile || "",
                    Audit: data.Audit || null,
                    Source: "Client" // Tag source
                } as Client);
            });

            // 2. Fetch HEADHUNTER LOGS (Hot Leads)
            // We'll manage this in a separate state temporarily or merge here if we used Promise.all (but onSnapshot is live).
            // Better approach: Set state for clients, then merge with leads in a separate effect or just manage two lists.
            // For simplicity, let's just append them to the 'clients' state via a functional update, 
            // BUT that risks duplicates or infinite loops if not careful.

            // Let's just setClients directly here, and I'll add a separate listener for Logs.
            setClients(prev => {
                // Keep only "Lead" types from previous state to avoid overwriting them
                const leads = prev.filter(c => c.Source === "Lead");
                return [...clientsFetched, ...leads];
            });
        });

        // 3. Listener for HOT LEADS (Headhunter)
        const qLeads = query(
            collection(db, "headhunter_logs"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
            const leadsFetched: Client[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'Archived') return;

                // Only include if it has a Company Name or URL
                const name = data.businessName || data.websiteUrl;

                leadsFetched.push({
                    id: doc.id,
                    FirstName: "Prospect",
                    LastName: "",
                    Company: name,
                    Role: "Lead",
                    Email: "", // Usually unknown at this stage
                    City: "",
                    Website: data.websiteUrl || "",
                    Audit: data.audit || null, // Capture the Deep Audit we just ran!
                    Source: "Lead"
                } as Client);
            });

            setClients(prev => {
                // Keep only "Client" types
                const realClients = prev.filter(c => c.Source === "Client");
                return [...realClients, ...leadsFetched];
            });
        });

        return () => {
            unsubscribeClients();
            unsubscribeLeads();
        };
    }, [user]);

    const toggleService = (serviceName: string) => {
        const newSet = new Set(selectedServices);
        if (newSet.has(serviceName)) newSet.delete(serviceName);
        else newSet.add(serviceName);
        setSelectedServices(newSet);
    };

    // Helper to group services
    const groupedServices = SERVICE_CATALOG.reduce((acc, service) => {
        if (!acc[service.category]) acc[service.category] = [];
        acc[service.category].push(service);
        return acc;
    }, {} as Record<string, typeof SERVICE_CATALOG>);

    const [isAuditing, setIsAuditing] = useState(false);
    const [mapsOverrideUrl, setMapsOverrideUrl] = useState(""); // NEW STATE

    // New Function: Run Audit on Existing Client
    const handleRefreshAudit = async () => {
        if (!selectedClientId) return;
        const client = clients.find(c => c.id === selectedClientId);

        let targetUrl = client?.Website;
        if (!targetUrl) {
            alert("Client needs a Website URL to audit.");
            return;
        }
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

        setIsAuditing(true);
        try {
            console.log(`🚀 Starting Live Audit...`);

            // Parallel Execution
            const [techRes, doctorRes, mapsRes] = await Promise.allSettled([
                fetch('/api/agents/tech', { method: 'POST', body: JSON.stringify({ websiteUrl: targetUrl }) }),
                fetch('/api/agents/doctor', { method: 'POST', body: JSON.stringify({ websiteUrl: targetUrl }) }),
                fetch('/api/agents/maps', {
                    method: 'POST',
                    body: JSON.stringify({
                        businessName: client?.Company,
                        city: client?.City || "Edmonton",
                        websiteUrl: targetUrl,
                        directUrl: mapsOverrideUrl // PASS THE OVERRIDE
                    })
                })
            ]);

            const auditData: any = { timestamp: new Date().toISOString() };

            // Safe JSON Helper
            const safeJson = async (res: any) => {
                try {
                    if (!res.ok) {
                        const text = await res.text();
                        console.error(`API Error (${res.status}):`, text.substring(0, 200));
                        return null;
                    }
                    return await res.json();
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    return null;
                }
            };

            if (techRes.status === 'fulfilled') auditData.tech = await safeJson(techRes.value);
            if (doctorRes.status === 'fulfilled') auditData.performance = await safeJson(doctorRes.value);
            if (mapsRes.status === 'fulfilled') auditData.google = await safeJson(mapsRes.value);

            // Save to Firestore (Handle Source Logic)
            if (client && client.Source === 'Client') {
                const clientRef = doc(db, "clients", selectedClientId!);
                await updateDoc(clientRef, { Audit: auditData });
            } else if (client) {
                // It's a Lead from Headhunter Logs
                const logRef = doc(db, "headhunter_logs", selectedClientId!);
                // Headhunter logs structure Audit differently usually (inside 'audit' field lower case)
                // Let's use 'audit' to match the schema we built earlier
                await updateDoc(logRef, { audit: auditData });
            }

            // Update Local State
            setClients(prev => prev.map(c => c.id === selectedClientId ? { ...c, Audit: auditData } : c));
            alert("Audit Complete! Data Refreshed.");

        } catch (error) {
            console.error("Audit Failed:", error);
            alert(`Audit failed: ${error}`);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedClientId) return;
        setIsGenerating(true);
        setPdfBase64(null);

        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return;

        try {
            // Call the AI Proposal Generator
            const res = await fetch('/api/closer/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName: client.Company,
                    audit: client.Audit, // Pass the deep audit we scraped
                    candidates: [{ name: `${client.FirstName} ${client.LastName}`, role: client.Role }]
                })
            });
            const data = await res.json();

            if (data.success && data.pdfBase64) {
                setPdfBase64(data.pdfBase64);
            } else {
                alert("Failed to generate: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("System Error generating proposal.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!pdfBase64 || !selectedClientId) return;
        const client = clients.find(c => c.id === selectedClientId);
        if (!client || !client.Email) {
            alert("Client does not have an email address on file.");
            return;
        }

        if (!confirm(`Send proposal to ${client.Email}?`)) return;

        setIsSending(true);
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: client.Email,
                    subject: `Partnership Proposal for ${client.Company}`,
                    html: `<p>Hi ${client.FirstName},</p><p>Please find attached our proposal for accelerating ${client.Company}'s growth with AI.</p><p>Best,<br>AI Precision Marketing</p>`,
                    attachments: [
                        {
                            filename: `Proposal - ${client.Company}.pdf`,
                            content: pdfBase64,
                            encoding: 'base64'
                        }
                    ]
                })
            });
            const data = await res.json();
            if (data.success) {
                alert("Email sent successfully!");
            } else {
                alert("Failed to send email: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error sending email.");
        } finally {
            setIsSending(false);
        }
    };

    const handleArchiveClient = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Remove this lead from the filtered list? (It will be archived)")) return;

        const client = clients.find(c => c.id === id);
        if (!client) return;

        try {
            // Determine collection based on Source
            const collectionName = client.Source === 'Lead' ? 'headhunter_logs' : 'leads'; // Leads usually in 'leads' or 'clients', but here we distinguished Source

            // Correction: In useEffect, 'Client' source comes from 'clients' collection.
            // 'Lead' source comes from 'headhunter_logs'.
            const targetCollection = client.Source === 'Lead' ? 'headhunter_logs' : 'clients';

            await updateDoc(doc(db, targetCollection, id), {
                Status: "Archived",
                status: "Archived" // Handle both casing conventions (headhunter uses lowercase)
            });

            if (selectedClientId === id) setSelectedClientId(null);
        } catch (error) {
            console.error("Error archiving lead:", error);
            alert("Failed to archive lead.");
        }
    };

    const selectedClientData = clients.find(c => c.id === selectedClientId);

    return (
        <div className="flex h-screen bg-[#020817] text-white font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Handshake size={32} className="text-secondary" />
                    Closer Agent
                </h1>
                <p className="text-gray-400 mb-8">Generate and send AI-driven proposals based on aggregated intelligence.</p>

                <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">

                    {/* LEFT: Configuration */}
                    <div className="col-span-4 space-y-6 overflow-y-auto pr-2">

                        {/* 1. Select Target Client */}
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">1. Select Target</h2>
                            <div className="space-y-2">
                                {clients.length === 0 && <p className="text-sm text-gray-500">No targets found.</p>}

                                {/* Group by Source for cleaner UI */}
                                {["Client", "Lead"].map(sourceType => {
                                    const group = clients.filter(c => c.Source === sourceType);
                                    if (group.length === 0) return null;

                                    return (
                                        <div key={sourceType} className="mb-4">
                                            <div className="text-[10px] font-bold text-gray-600 uppercase mb-2 ml-1">{sourceType === 'Client' ? 'Active Clients' : 'Hot Prospects (Staging)'}</div>
                                            {group.map(client => (
                                                <div
                                                    key={client.id}
                                                    onClick={() => setSelectedClientId(client.id)}
                                                    className={`p-3 rounded-lg cursor-pointer border transition-all group/item relative mb-2 ${selectedClientId === client.id ? 'bg-secondary/10 border-secondary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="font-bold text-sm pr-6 truncate">{client.Company || "Unknown Company"}</div>
                                                        <div className="flex gap-2">
                                                            {client.Audit ? (
                                                                <span title="Audit Ready" className="flex items-center gap-1 bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded text-[10px] border border-green-500/20">
                                                                    <CheckCircle2 size={10} /> {client.Audit.google?.totalScore || "?"}★
                                                                </span>
                                                            ) : (
                                                                <span title="No Data" className="flex items-center gap-1 bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                                                                    Needs Audit
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleArchiveClient(client.id, e)}
                                                                className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded transition-all absolute top-2 right-2"
                                                                title="Archive (Hide)"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-400 flex justify-between">
                                                        <span>{client.FirstName} {client.LastName}</span>
                                                        <span className="opacity-50">{sourceType}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Configure Services */}
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">2. Select Services</h2>
                            <div className="space-y-6">
                                {Object.entries(groupedServices).map(([category, services]) => (
                                    <div key={category}>
                                        <h3 className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">{category}</h3>
                                        <div className="space-y-2">
                                            {services.map(service => (
                                                <label key={service.id} className="flex items-start gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedServices.has(service.name)}
                                                        onChange={() => toggleService(service.name)}
                                                        className="mt-1 rounded border-gray-600 text-secondary focus:ring-secondary bg-transparent"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-white group-hover:text-secondary transition-colors">{service.name}</div>
                                                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{service.description}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Template (Placeholder) */}
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl p-5 opacity-75">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-sm font-bold text-gray-400 uppercase">3. Template</h2>
                                <span className="text-xs bg-secondary text-black px-1.5 py-0.5 rounded font-bold">DEFAULT</span>
                            </div>
                            <div className="aspect-[3/4] bg-gradient-to-br from-green-800 to-green-950 rounded border border-white/10 flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                                    <span className="text-xs text-white font-medium">Change Template (Soon)</span>
                                </div>
                                <div className="text-center p-4">
                                    <div className="text-2xl">🧠</div>
                                    <div className="text-xs font-bold mt-2 text-white">AI Precision</div>
                                </div>
                            </div>
                            <button className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded py-2 transition-colors">
                                <CloudUpload size={14} /> Upload Custom Template
                            </button>
                        </div>

                    </div>

                    {/* RIGHT: Preview & Action */}
                    <div className="col-span-8 bg-[#0B1221] border border-white/10 rounded-xl flex flex-col relative overflow-hidden">
                        {/* Toolbar */}
                        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#020817]">
                            <div className="font-semibold flex items-center gap-4">
                                Proposal Preview
                                {selectedClientId && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Paste Google Maps Link (Optional)"
                                            className="bg-[#020817] border border-white/10 rounded px-2 py-1 text-xs text-secondary w-64 focus:outline-none focus:border-secondary/50 placeholder:text-gray-700"
                                            value={mapsOverrideUrl}
                                            onChange={(e) => setMapsOverrideUrl(e.target.value)}
                                        />
                                        <button
                                            onClick={handleRefreshAudit}
                                            disabled={isAuditing}
                                            className="text-xs bg-blue-900/50 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-900 flex items-center gap-2 transition-all"
                                        >
                                            {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                            {isAuditing ? "Auditing..." : "Refresh Live Data"}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!selectedClientId || isGenerating}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                    {isGenerating ? "Generating..." : "Generate PDF"}
                                </button>

                                <button
                                    onClick={handleSendEmail}
                                    disabled={!pdfBase64 || isSending}
                                    className="px-4 py-2 bg-secondary text-black hover:bg-secondary/90 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    {isSending ? "Sending..." : "Send to Client"}
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-[#1a1f2e] overflow-y-auto flex items-center justify-center p-8">
                            {pdfBase64 ? (
                                <iframe
                                    src={`data:application/pdf;base64,${pdfBase64}`}
                                    className="w-full h-full rounded shadow-2xl"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="text-center opacity-30">
                                    <FileText size={64} className="mx-auto mb-4" />
                                    <p className="text-lg font-medium">Select a client and generate to preview.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
