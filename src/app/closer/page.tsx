"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from "../components/Sidebar";
import { db } from "../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Handshake, FileText, Send, CheckCircle2, Loader2, Download, CloudUpload, Trash2 } from 'lucide-react';
import { SERVICE_CATALOG } from "./services";

interface Client {
    id: string;
    FirstName: string;
    LastName: string;
    Company: string;
    Role: string;
    Email: string;
    [key: string]: any;
}

export default function CloserPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set(SERVICE_CATALOG.map(s => s.name)));

    // Status States
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        // Fetch LEADS. Removing orderBy to ensure we get results even if 'createdAt' is missing
        const q = query(collection(db, "leads"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("CloserPage: Snapshot received.", snapshot.size, "docs");
            const fetched: Client[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Lead:", doc.id, "HasAudit:", !!data.SeoAudit);

                // Relaxed Filter: Include even if BusinessName is missing (fallback to ID or 'Prospect')
                const nameParts = (data.OwnerName || "Valued Prospect").split(' ');

                // Filter out Archived leads
                if (data.Status === 'Archived') return;

                fetched.push({
                    id: doc.id,
                    FirstName: nameParts[0],
                    LastName: nameParts.slice(1).join(' '),
                    Company: data.BusinessName || "Lead " + doc.id.substring(0, 4),
                    Role: "Owner",
                    Email: data.VerifiedEmail || data.Email || "",
                    SeoAudit: data.SeoAudit
                } as Client);
            });

            console.log("CloserPage: Set clients to", fetched.length);
            setClients(fetched);
        });
        return () => unsubscribe();
    }, []);

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

    const handleGenerate = async () => {
        if (!selectedClientId) return;
        setIsGenerating(true);
        setPdfBase64(null);

        try {
            const res = await fetch('/api/closer/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClientId,
                    services: Array.from(selectedServices)
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
        if (!confirm("Remove this lead from the filtered list? (It will be archived, not deleted)")) return;

        try {
            await updateDoc(doc(db, "leads", id), {
                Status: "Archived"
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

                        {/* 1. Select Client */}
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl p-5">
                            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">1. Select Target Client</h2>
                            <div className="space-y-2">
                                {clients.length === 0 && <p className="text-sm text-gray-500">No clients found. Promote leads first.</p>}
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all group/item relative ${selectedClientId === client.id ? 'bg-secondary/10 border-secondary' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-sm pr-6">{client.Company || "Unknown Company"}</div>
                                            <div className="flex gap-2">
                                                {client.SeoAudit && (
                                                    <span title="SEO Audit Ready">
                                                        <CheckCircle2 size={14} className="text-green-500" />
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => handleArchiveClient(client.id, e)}
                                                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded transition-all absolute top-2 right-2"
                                                    title="Archive (Hide) Lead"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400">{client.FirstName} {client.LastName}</div>
                                    </div>
                                ))}
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
                            <div className="font-semibold">Proposal Preview</div>
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
