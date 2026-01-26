"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from "../components/Sidebar";
import { db } from "../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, arrayUnion, writeBatch } from "firebase/firestore";
import { Phone, Globe, Star, AlertCircle, Building2, X, Trash2, Edit2, Save, Plus, BarChart3, Clock, Share2, Smartphone, Zap, Search, UserCheck, Linkedin, Briefcase, Code2, FileText, Send, Facebook, Instagram, Twitter, MapPin, Target, Loader2, Camera, Tag } from 'lucide-react';

interface Note {
    id?: string;
    text: string;
    createdAt: string;
    author: string;
}

interface SocialPost {
    platform: string;
    date: string;
    content: string;
    link?: string;
}

interface Lead {
    id: string;
    BusinessName?: string;
    Address?: string;
    Phone?: string;
    Website?: string;
    Rating?: string;
    ViabilityScore?: string;
    raw?: string;
    scoutedAt?: string;

    // Deep Dive
    OwnerName?: string;
    ReviewsCount?: string;
    GoogleRanking?: string;
    SeoScore?: string;

    // 1. Marketing Gaps
    MissedCallProb?: string;
    GmbVelocity?: string;
    LastSocialPost?: string;
    AdStatus?: string;

    // 2. Technical Health
    PageLoadSpeed?: string;
    MobileFriendly?: string;
    KeywordGaps?: string;

    // 3. Decision Maker
    LinkedinProfile?: string;
    VerifiedEmail?: string;
    CompanySize?: string;

    // 4. Behavioral
    HiringRoles?: string;
    TechStack?: string;

    // 5. Digital Footprint
    GmbLink?: string;
    PostFrequency?: string; // "Daily", "Weekly", "Monthly", "Inactive"

    // Notes
    Notes?: Note[];
    Category?: string;
    City?: string;

    [key: string]: any;

    // SEO Agent Data
    SeoAudit?: {
        titleLength?: number;
        descriptionLength?: number;
        mobileResponsive?: boolean;
        h1Count?: number;
        loadTime?: string;
        titleDuplicateWords?: number;
        globalScore?: number;
        timestamp?: string;
        raw?: any;
        aiSummary?: string;
    };
}

interface Candidate {
    name: string;
    role: string;
    linkedinUrl: string;
    confidence?: number;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isNewLead, setIsNewLead] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'seo'>('details');

    // Helper for SEO Analysis
    const [isAnalyzingSeo, setIsAnalyzingSeo] = useState(false);

    // Head Hunter State
    const [isHunting, setIsHunting] = useState(false);
    const [huntResults, setHuntResults] = useState<Candidate[]>([]);
    const [showHuntModal, setShowHuntModal] = useState(false);

    // Social Scraper State
    const [isScrapingSocial, setIsScrapingSocial] = useState(false);

    // ...

    const handleSocialScrape = async (lead: Lead) => {
        if (!lead.Website) {
            alert("No website URL available for this lead.");
            return;
        }

        let targetUrl = lead.Website;
        if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

        setIsScrapingSocial(true);
        try {
            const res = await fetch('/api/social/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: lead.id,
                    websiteUrl: targetUrl
                })
            });
            const data = await res.json();

            if (data.success && data.social) {
                // Optimistic Update
                const updatedLead = {
                    ...lead,
                    Social: data.social
                };
                setSelectedLead(updatedLead);
                setFormData(prev => ({ ...prev, Social: data.social }));

                alert(`Paparazzi found ${Object.keys(data.social).filter(k => k !== 'summary' && k !== 'lastScraped').length} profiles.`);
            } else {
                alert("Scraper finished but found no data: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            console.error("Social Scrape Failed", e);
            alert("Failed to run Paparazzi.");
        } finally {
            setIsScrapingSocial(false);
        }
    };

    // Form State (for edit/add)
    const [formData, setFormData] = useState<Partial<Lead>>({});

    // New Note State
    const [newNote, setNewNote] = useState("");

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedCity, setSelectedCity] = useState("All");

    // Derived State
    const categories = ['All', ...Array.from(new Set(leads.map(l => l.Category).filter(Boolean)))];
    const cities = ['All', ...Array.from(new Set(leads.map(l => l.City).filter(Boolean)))];

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = (lead.BusinessName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (lead.OwnerName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || lead.Category === selectedCategory;
        const matchesCity = selectedCity === 'All' || lead.City === selectedCity;
        return matchesSearch && matchesCategory && matchesCity;
    });

    useEffect(() => {
        const q = query(
            collection(db, "leads"),
            orderBy("scoutedAt", "desc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLeads: Lead[] = [];
            snapshot.forEach((doc) => {
                fetchedLeads.push({ id: doc.id, ...doc.data() } as Lead);
            });
            setLeads(fetchedLeads);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- Actions ---

    const handleRowClick = (lead: Lead) => {
        setSelectedLead(lead);
        setFormData(lead);
        setIsEditMode(false);
        setIsNewLead(false);
        setNewNote("");
        setHuntResults([]);
        setShowHuntModal(false);
        setActiveTab('details'); // Reset tab
    };

    // ... (handleAddNew, handleCloseModal, handleDelete, handleSave, handleAddNote, bulk logic remain same) ...

    const runSeoAnalysis = async () => {
        const btn = document.getElementById('run-seo-btn');
        if (btn) btn.innerText = "Running Smart Scraper...";
        setIsAnalyzingSeo(true);

        try {
            // New "Smart Scraper" Endpoint
            const res = await fetch('/api/agents/smart-scraper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName: selectedLead?.BusinessName,
                    websiteUrl: selectedLead?.Website
                })
            });
            const response = await res.json();

            if (response.success && response.data) {
                const report = response.data;
                const seoData = {
                    ...report.seo,
                    timestamp: new Date().toISOString(),
                    raw: report, // Store full new report structure in raw
                    aiSummary: report.aiSummary || "Analysis Pending"
                };

                // Update Lead
                await updateDoc(doc(db, "leads", selectedLead!.id), {
                    SeoAudit: seoData,
                    BusinessLogic: report.businessLogic, // Save Data-to-Dollar logic
                    // Auto-Enrichment (Only if missing)
                    Phone: selectedLead?.Phone || report.enrichment.phones[0] || "",
                    OwnerName: selectedLead?.OwnerName || report.ownerName || "",
                    VerifiedEmail: selectedLead?.VerifiedEmail || report.verifiedEmail || "",
                    LinkedinProfile: selectedLead?.LinkedinProfile || (report.enrichment.socials.find((s: any) => s.platform === 'linkedin')?.url) || ""
                });

                // Optimistic Update
                const newValues = {
                    SeoAudit: seoData,
                    Phone: selectedLead?.Phone || report.enrichment.phones[0] || "",
                    OwnerName: selectedLead?.OwnerName || report.ownerName || "",
                    VerifiedEmail: selectedLead?.VerifiedEmail || report.verifiedEmail || "",
                    LinkedinProfile: selectedLead?.LinkedinProfile || (report.enrichment.socials.find((s: any) => s.platform === 'linkedin')?.url) || "",
                };

                setFormData(prev => ({ ...prev, ...newValues }));
                setSelectedLead(prev => prev ? ({ ...prev, ...newValues }) : null);
            } else {
                alert("Scraper Error: " + response.error);
            }
        } catch (e) {
            console.error(e);
            alert("Smart Scraper Failed. Check console.");
        } finally {
            setIsAnalyzingSeo(false);
            if (btn) btn.innerText = "Run Smart Audit";
        }
    };

    const handleAddNew = () => {
        const newLead: Partial<Lead> = {
            BusinessName: "",
            Address: "Edmonton, AB",
            Phone: "",
            Website: "",
            Rating: "0.0",
            ViabilityScore: "Low",
            OwnerName: "",
            ReviewsCount: "0",
            SeoScore: "0",
            GoogleRanking: "0",
            Notes: [],
            PostFrequency: "Unknown"
        };
        setSelectedLead(null);
        setFormData(newLead);
        setIsEditMode(true);
        setIsNewLead(true);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
        setIsEditMode(false);
        setIsNewLead(false);
    };

    const handleDelete = async () => {
        if (!selectedLead?.id) return;
        if (!window.confirm("Are you sure you want to delete this lead?")) return;

        try {
            await deleteDoc(doc(db, "leads", selectedLead.id));
            handleCloseModal();
        } catch (e) {
            console.error("Error deleting document: ", e);
            alert("Failed to delete lead.");
        }
    };

    const handleSave = async () => {
        try {
            if (isNewLead) {
                // ADD
                await addDoc(collection(db, "leads"), {
                    ...formData,
                    scoutedAt: new Date().toISOString(),
                    source: "Manual Entry"
                });
            } else {
                // UPDATE
                if (!selectedLead?.id) return;
                await updateDoc(doc(db, "leads", selectedLead.id), {
                    ...formData
                });
            }
            handleCloseModal();
        } catch (e) {
            console.error("Error saving document: ", e);
            alert("Failed to save lead.");
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedLead?.id) return;
        const note: Note = { text: newNote, createdAt: new Date().toISOString(), author: "User" };
        try {
            await updateDoc(doc(db, "leads", selectedLead.id), { Notes: arrayUnion(note) });
            const updatedNotes = [...(formData.Notes || []), note];
            setFormData(prev => ({ ...prev, Notes: updatedNotes }));
            setSelectedLead(prev => prev ? ({ ...prev, Notes: updatedNotes }) : null);
            setNewNote("");
        } catch (e) { console.error("Failed to add note", e); }
    };

    // --- BULK DELETE ---
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected leads? This cannot be undone.`)) return;

        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            batch.delete(doc(db, "leads", id));
        });

        try {
            await batch.commit();
            setSelectedIds(new Set());
            alert("Leads deleted successfully.");
        } catch (e) {
            console.error("Bulk delete failed", e);
            alert("Failed to delete leads.");
        }
    };

    // HEAD HUNTER LOGIC (UPDATED WITH API)
    const handleHeadHunter = async () => {
        if (formData.OwnerName) {
            // Promote Flow
            promoteToClient(formData.OwnerName, formData.LinkedinProfile);
            return;
        }

        if (!formData.Website) {
            alert("Please add a Website URL first to run the Head Hunter.");
            return;
        }

        let targetUrl = formData.Website;
        if (targetUrl && !targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }

        setIsHunting(true);
        try {
            const res = await fetch('/api/headhunter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websiteUrl: targetUrl })
            });
            const data = await res.json();

            if (data.candidates && data.candidates.length > 0) {
                setHuntResults(data.candidates);
                setShowHuntModal(true);

                // --- LOGGING ---
                // Save this run to the persistent Head Hunter Log
                try {
                    await addDoc(collection(db, "headhunter_logs"), {
                        websiteUrl: formData.Website,
                        businessName: formData.BusinessName || "Unknown",
                        timestamp: new Date().toISOString(),
                        candidates: data.candidates,
                        totalFound: data.meta?.totalFound || data.candidates.length,
                        runId: data.runId || "manual"
                    });
                    console.log("Head Hunter run logged successfully.");
                } catch (logErr) {
                    console.error("Failed to log Head Hunter run:", logErr);
                }
                // ---------------

            } else {
                alert("Head Hunter finished but found no high-confidence profiles. Try manual entry.");
            }
        } catch (e) {
            console.error("Head Hunter Error", e);
            alert("Head Hunter failed to connect. Check API implementation.");
        } finally {
            setIsHunting(false);
        }
    };

    const selectCandidate = (candidate: Candidate) => {
        setFormData(prev => ({
            ...prev,
            OwnerName: candidate.name,
            LinkedinProfile: candidate.linkedinUrl // Assuming backend maps 'url' to 'linkedinUrl'
        }));
        setShowHuntModal(false);
        // Optional: Auto-save or just let user click save
    };

    const promoteToClient = async (name: string, linkedin?: string) => {
        if (!window.confirm(`Promote ${name} to a new Client Lead?`)) return;

        try {
            const nameParts = name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            await addDoc(collection(db, "clients"), {
                FirstName: firstName,
                LastName: lastName,
                Role: "Owner", // Default expectation
                Status: "Scraped",
                Company: formData.BusinessName,
                Phone: formData.Phone,
                Email: formData.VerifiedEmail, // Pass matched email
                Address: formData.Address,
                LinkedinProfile: linkedin, // Pass this through
                createdAt: new Date().toISOString(),
                sourceLeadId: selectedLead?.id
            });

            alert(`${name} has been added to your Client Leads.`);
        } catch (e) {
            console.error("Head Hunter failed", e);
            alert("Failed to promote to client.");
        }
    }


    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex h-screen bg-[#020817] text-white font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto relative">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Company Lead Manager</h1>
                        <p className="text-gray-400 mt-1">Manage your B2B relationships and business intelligence.</p>

                        {/* Search & Filter Bar */}
                        <div className="flex gap-4 mt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search leads..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg text-sm text-white focus:outline-none focus:border-[#4ade80] min-w-[300px]"
                                />
                            </div>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg text-sm text-white focus:outline-none focus:border-[#4ade80]"
                            >
                                <option value="All">All Categories</option>
                                {categories.filter(c => c !== 'All').map(cat => (
                                    <option key={cat as string} value={cat as string}>{cat}</option>
                                ))}
                            </select>

                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg text-sm text-white focus:outline-none focus:border-[#4ade80]"
                            >
                                <option value="All">All Cities</option>
                                {cities.filter(c => c !== 'All').map(city => (
                                    <option key={city as string} value={city as string}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-md font-semibold hover:bg-red-500/20 transition-colors animate-in fade-in slide-in-from-right-4"
                            >
                                <Trash2 size={18} />
                                Delete {selectedIds.size} Selected
                            </button>
                        )}
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-2 bg-secondary text-black px-4 py-2 rounded-md font-semibold hover:bg-secondary/90 transition-colors"
                        >
                            <Plus size={18} />
                            Add Manually
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64 border border-white/10 rounded-xl bg-white/5 animate-pulse">
                        <span className="text-gray-400">Syncing Database...</span>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 border border-white/10 rounded-xl bg-white/5 border-dashed">
                        <div className="p-4 rounded-full bg-white/10 mb-4">
                            <Building2 size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No Leads Found Yet</h3>
                        <p className="text-gray-400 mt-2 max-w-md text-center">
                            Launch "The Scout" from God Mode to find AI-vulnerable businesses in your area.
                        </p>
                    </div>
                ) : (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0B1221]">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="w-10 px-4 py-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-white/20 bg-white/5 checked:bg-secondary"
                                            checked={leads.length > 0 && selectedIds.size === leads.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-4">Business</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">City</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Stats</th>
                                    <th className="px-6 py-4">Viability</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLeads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedIds.has(lead.id) ? 'bg-blue-500/5' : ''}`}
                                        onClick={(e) => {
                                            // Prevent row click if clicking checkbox
                                            // @ts-ignore
                                            if (e.target.type !== 'checkbox') handleRowClick(lead);
                                        }}
                                    >
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-white/20 bg-white/5 checked:bg-secondary"
                                                checked={selectedIds.has(lead.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelection(lead.id);
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">
                                                {lead.BusinessName || lead["Business Name"] || "Unknown Business"}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                                                {lead.Address || "No Address"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.Category ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                                                    <Tag size={10} />
                                                    {lead.Category}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                                <MapPin size={12} className="text-gray-500" />
                                                {lead.City || "Unknown"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {lead.Phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Phone size={12} className="text-secondary" />
                                                        {lead.Phone}
                                                    </div>
                                                )}
                                                {lead.Website && (
                                                    <div className="flex items-center gap-2 text-sm text-blue-400 group-hover:text-blue-300">
                                                        <Globe size={12} />
                                                        <span className="truncate max-w-[150px]">{lead.Website}</span>
                                                    </div>
                                                )}
                                                {lead.GmbLink && (
                                                    <div className="flex items-center gap-2 text-xs text-green-400 mt-1">
                                                        <MapPin size={10} />
                                                        GMB Linked
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">{lead.Rating || "N/A"}</span>
                                                    <span className="text-xs text-gray-500">({lead.ReviewsCount || "0"} reviews)</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Rank: #{lead.GoogleRanking || "?"} | SEO: {lead.SeoScore || "0"}/100
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.ViabilityScore?.includes("High") ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    High Potential
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                                    Low Priority
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {lead.HiringRoles ? (
                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">HIRING</span>
                                            ) : (
                                                <span className="text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- LEAD DETAILS MODAL --- */}
                {(selectedLead || isNewLead) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">

                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#020817]">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        {isEditMode ? (isNewLead ? "Add New Lead" : "Edit Lead") : (selectedLead?.BusinessName || "Lead Details")}
                                        {!isEditMode && selectedLead?.ViabilityScore?.includes("High") && (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/20 font-medium">High Viability</span>
                                        )}
                                    </h2>
                                    <p className="text-sm text-gray-400 mt-1">ID: {selectedLead?.id || "New"}</p>
                                </div>
                                <div className="flex gap-2">
                                    {!isEditMode ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditMode(true)}
                                                className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="p-2 hover:bg-red-500/10 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => { setIsEditMode(false); if (isNewLead) handleCloseModal(); }}
                                            className="px-3 py-1.5 hover:bg-white/10 rounded-md text-gray-400 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button onClick={handleCloseModal} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Tab Navigation */}
                            <div className="px-6 pt-4 border-b border-white/10 flex gap-6">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-secondary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('seo')}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'seo' ? 'border-secondary text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                >
                                    SEO Audit Report
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                {activeTab === 'details' ? (
                                    <div className="grid grid-cols-12 gap-8">

                                        {/* LEFT COLUMN (Core + Intelligence) */}
                                        <div className="col-span-12 lg:col-span-8 space-y-8">

                                            {/* 1. Decision Maker */}
                                            <div className="bg-white/5 rounded-lg p-5 border border-white/10 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                                                <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <UserCheck size={16} className="text-secondary" />
                                                        DECISION MAKER INTELLIGENCE
                                                    </h3>

                                                    {/* HEAD HUNTER BUTTON */}
                                                    {(!isEditMode && !isNewLead) && (
                                                        <div className="flex gap-2">
                                                            {/* SOCIAL SCRAPER BUTTON */}
                                                            <button
                                                                onClick={() => handleSocialScrape(selectedLead!)}
                                                                disabled={isScrapingSocial}
                                                                className="flex items-center gap-1.5 bg-pink-500/10 text-pink-400 text-xs px-2 py-1 rounded border border-pink-500/20 hover:bg-pink-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                {isScrapingSocial ? (
                                                                    <> <Loader2 size={12} className="animate-spin" /> Paparazzi...</>
                                                                ) : (
                                                                    <> <Camera size={12} /> Scan Socials </>
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={handleHeadHunter}
                                                                disabled={isHunting}
                                                                className="flex items-center gap-1.5 bg-secondary/10 text-secondary text-xs px-2 py-1 rounded border border-secondary/20 hover:bg-secondary/20 transition-colors disabled:opacity-50"
                                                            >
                                                                {isHunting ? (
                                                                    <> <Loader2 size={12} className="animate-spin" /> Hunting... </>
                                                                ) : formData.OwnerName ? (
                                                                    <> <Target size={12} /> Promote to Client </>
                                                                ) : (
                                                                    <> <Target size={12} /> Run Head Hunter </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">Owner / President</label>
                                                        {isEditMode ? (
                                                            <input
                                                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                                value={formData.OwnerName || ""}
                                                                onChange={e => handleChange("OwnerName", e.target.value)}
                                                                placeholder="e.g. John Doe"
                                                            />
                                                        ) : (
                                                            <div className="text-lg font-medium text-white">{formData.OwnerName || "Unknown"}</div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">LinkedIn</label>
                                                        {isEditMode ? <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.LinkedinProfile || ""} onChange={e => handleChange("LinkedinProfile", e.target.value)} placeholder="URL" /> : formData.LinkedinProfile ? <a href={formData.LinkedinProfile} target="_blank" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"><Linkedin size={14} /> View Profile</a> : <span className="text-gray-500 text-sm">-</span>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">Verified Email</label>
                                                        {isEditMode ? <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.VerifiedEmail || ""} onChange={e => handleChange("VerifiedEmail", e.target.value)} placeholder="john@example.com" /> : <div className="text-sm text-white">{formData.VerifiedEmail || "Unknown"}</div>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">Website</label>
                                                        <div className="flex items-center gap-2">
                                                            {isEditMode ? (
                                                                <input
                                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                                    value={formData.Website || ""}
                                                                    onChange={e => handleChange("Website", e.target.value)}
                                                                    placeholder="https://example.com"
                                                                />
                                                            ) : (
                                                                formData.Website ? (
                                                                    <a
                                                                        href={formData.Website?.startsWith('http') ? formData.Website : `https://${formData.Website}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:underline truncate block text-sm"
                                                                    >
                                                                        {formData.Website}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-gray-500 text-sm">-</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">Company Size</label>
                                                        {isEditMode ? (
                                                            <input
                                                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                                                value={formData.CompanySize || ""}
                                                                onChange={e => handleChange("CompanySize", e.target.value)}
                                                                placeholder="1-10, 11-50..."
                                                            />
                                                        ) : (
                                                            <div className="text-sm text-gray-300">{formData.CompanySize || "Unknown"}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. DIGITAL FOOTPRINT (SOCIAL & GMB) */}
                                            <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                                                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                    <Share2 size={16} className="text-pink-400" />
                                                    DIGITAL FOOTPRINT & SOCIAL
                                                </h3>

                                                {formData.Social && (
                                                    <div className="mb-4 bg-black/30 p-3 rounded-lg border border-pink-500/20">
                                                        <div className="flex gap-4 mb-2">
                                                            {formData.Social.facebook && <a href={formData.Social.facebook} target="_blank" className="text-blue-500 hover:text-blue-400"><Facebook size={20} /></a>}
                                                            {formData.Social.instagram && <a href={formData.Social.instagram} target="_blank" className="text-pink-500 hover:text-pink-400"><Instagram size={20} /></a>}
                                                            {formData.Social.linkedin && <a href={formData.Social.linkedin} target="_blank" className="text-blue-400 hover:text-blue-300"><Linkedin size={20} /></a>}
                                                            {formData.Social.twitter && <a href={formData.Social.twitter} target="_blank" className="text-sky-500 hover:text-sky-400"><Twitter size={20} /></a>}

                                                            {/* If empty */}
                                                            {!formData.Social.facebook && !formData.Social.instagram && !formData.Social.linkedin && !formData.Social.twitter && (
                                                                <span className="text-xs text-gray-500 italic">No social links found.</span>
                                                            )}
                                                        </div>
                                                        {formData.Social.summary && (
                                                            <div className="text-xs text-gray-400 border-t border-white/10 pt-2 mt-2">
                                                                <span className="text-pink-400 font-bold">Paparazzi Report:</span> {formData.Social.summary}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* GMB Link (existing logic) */}
                                                    {/* GMB Link */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-gray-500 uppercase font-semibold">Google My Business</label>
                                                        {isEditMode ? (
                                                            <div className="flex gap-2">
                                                                <input className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.GmbLink || formData.googleMapsUrl || ""} onChange={e => handleChange("GmbLink", e.target.value)} placeholder="https://maps.google.com/..." />
                                                            </div>
                                                        ) : (
                                                            (formData.GmbLink || formData.googleMapsUrl) ? (
                                                                <a href={formData.GmbLink || formData.googleMapsUrl} target="_blank" className="flex items-center gap-2 text-green-400 bg-green-500/10 px-3 py-2 rounded border border-green-500/20 hover:bg-green-500/20 transition-colors w-full justify-center font-semibold text-sm">
                                                                    <MapPin size={16} /> Open GMB Profile
                                                                </a>
                                                            ) : <div className="text-gray-500 text-sm">No GMB Link detected.</div>
                                                        )}
                                                    </div>

                                                    {/* Social Metrics */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Est. Post Frequency</span>
                                                            {isEditMode ? (
                                                                <select className="bg-transparent text-xs text-white outline-none" value={formData.PostFrequency || "Unknown"} onChange={e => handleChange("PostFrequency", e.target.value)}>
                                                                    <option value="Unknown">Unknown</option>
                                                                    <option value="Daily (30+/mo)">Daily (30+/mo)</option>
                                                                    <option value="Weekly (4-8/mo)">Weekly (4-8/mo)</option>
                                                                    <option value="Monthly (1-3/mo)">Monthly (1-3/mo)</option>
                                                                    <option value="Rarely (<1/mo)">Rarely (&lt;1/mo)</option>
                                                                    <option value="Inactive">Inactive</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`text-xs font-bold ${formData.PostFrequency === 'Inactive' || formData.PostFrequency?.includes('Rarely') ? 'text-red-400' : 'text-gray-300'}`}>
                                                                    {formData.PostFrequency || "Unknown"}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Last Social Post</span>
                                                            {isEditMode ? <input className="bg-black/40 text-xs text-white w-24 px-1 rounded" value={formData.LastSocialPost || ""} onChange={e => handleChange("LastSocialPost", e.target.value)} placeholder="YYYY-MM-DD" /> : <span className="text-xs text-white">{formData.LastSocialPost || "Never"}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Marketing Gaps (The Sell) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                        <BarChart3 size={16} className="text-purple-400" />
                                                        MARKETING GAPS
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {/* Missed Call */}
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Missed Call Risk</span>
                                                            {isEditMode ? (
                                                                <select className="bg-transparent text-xs text-white outline-none" value={formData.MissedCallProb || "Low"} onChange={e => handleChange("MissedCallProb", e.target.value)}>
                                                                    <option value="Low">Low</option>
                                                                    <option value="Med">Medium</option>
                                                                    <option value="High">High</option>
                                                                    <option value="Critical">Critical</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`text-xs font-bold ${formData.MissedCallProb === 'High' || formData.MissedCallProb === 'Critical' ? 'text-red-400' : 'text-gray-300'}`}>{formData.MissedCallProb || "Unknown"}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">GMB Response Check</span>
                                                            {isEditMode ? <input className="bg-black/40 text-xs text-white w-20 px-1 rounded" value={formData.GmbVelocity || ""} onChange={e => handleChange("GmbVelocity", e.target.value)} placeholder="e.g. 24h+" /> : <span className="text-xs text-white">{formData.GmbVelocity || "Untracked"}</span>}
                                                        </div>
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Ad Tracking</span>
                                                            {isEditMode ? (
                                                                <select
                                                                    className="bg-transparent text-xs text-white outline-none"
                                                                    value={formData.AdStatus || "Inactive"}
                                                                    onChange={e => handleChange("AdStatus", e.target.value)}
                                                                >
                                                                    <option value="Inactive">Inactive</option>
                                                                    <option value="Active">Active Running</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`text-xs font-bold ${formData.AdStatus === 'Active' ? 'text-green-400' : 'text-gray-500'}`}>
                                                                    {formData.AdStatus || "Inactive"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                        <Zap size={16} className="text-yellow-400" />
                                                        TECHNICAL HEALTH
                                                    </h3>

                                                    {/* SEO AUDIT AGENT */}
                                                    {!isNewLead && !isEditMode && (
                                                        <div className="mb-4 p-3 bg-black/20 rounded border border-white/5">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs text-secondary font-bold uppercase">SEO Agent</span>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!formData.Website) return alert("No Website URL");
                                                                        const btn = document.getElementById('run-seo-btn');
                                                                        if (btn) btn.innerText = "Running...";

                                                                        try {
                                                                            const res = await fetch('/api/agents/seo', {
                                                                                method: 'POST',
                                                                                body: JSON.stringify({ websiteUrl: formData.Website })
                                                                            });
                                                                            const data = await res.json();
                                                                            if (data.success && data.data) {
                                                                                const audit = data.data;
                                                                                const raw = audit; // Keep full raw data

                                                                                // Map to our schema
                                                                                const seoData = {
                                                                                    titleLength: audit.titleLength,
                                                                                    mobileResponsive: audit.mobileResponsive,
                                                                                    h1Count: audit.h1Count,
                                                                                    titleDuplicateWords: audit.titleDuplicateWords,
                                                                                    timestamp: new Date().toISOString(),
                                                                                    raw: raw
                                                                                };

                                                                                // Update Lead
                                                                                await updateDoc(doc(db, "leads", selectedLead!.id), { SeoAudit: seoData });

                                                                                // Optimistic Update
                                                                                setFormData(prev => ({ ...prev, SeoAudit: seoData }));
                                                                                setSelectedLead(prev => prev ? ({ ...prev, SeoAudit: seoData }) : null);
                                                                            }
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                            alert("SEO Audit Failed");
                                                                        } finally {
                                                                            if (btn) btn.innerText = "Run Live Audit";
                                                                        }
                                                                    }}
                                                                    id="run-seo-btn"
                                                                    className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-1 rounded hover:bg-secondary/20 transition-colors"
                                                                >
                                                                    {formData.SeoAudit ? "Re-Run Audit" : "Run Live Audit"}
                                                                </button>
                                                            </div>

                                                            {formData.SeoAudit ? (
                                                                <div className="space-y-2 text-xs">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Mobile Friendly</span>
                                                                        <span className={formData.SeoAudit.mobileResponsive ? "text-green-400" : "text-red-400"}>
                                                                            {formData.SeoAudit.mobileResponsive ? "Yes" : "No/Unknown"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Title Length</span>
                                                                        <span className={formData.SeoAudit.titleLength && (formData.SeoAudit.titleLength > 60 || formData.SeoAudit.titleLength < 30) ? "text-yellow-400" : "text-gray-300"}>
                                                                            {formData.SeoAudit.titleLength || 0} chars
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">H1 Tags</span>
                                                                        <span className={formData.SeoAudit.h1Count === 1 ? "text-green-400" : "text-red-400"}>
                                                                            {formData.SeoAudit.h1Count || 0} (Should be 1)
                                                                        </span>
                                                                    </div>
                                                                    {formData.SeoAudit.titleDuplicateWords ? (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-400">Duplicate Words</span>
                                                                            <span className="text-red-400">{formData.SeoAudit.titleDuplicateWords} found</span>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-500 text-[10px] italic">No audit data yet.</div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Page Load Speed</span>
                                                            {isEditMode ? <input className="bg-black/40 text-xs text-white w-12 px-1 rounded" value={formData.PageLoadSpeed || ""} onChange={e => handleChange("PageLoadSpeed", e.target.value)} placeholder="Sec" /> : <span className={`text-xs font-bold ${Number(formData.PageLoadSpeed) > 3 ? 'text-red-400' : 'text-green-400'}`}>{formData.PageLoadSpeed ? `${formData.PageLoadSpeed}s` : "N/A"}</span>}
                                                        </div>
                                                        {/* ... Mobile Friendly, etc ... */}
                                                        <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                                                            <span className="text-xs text-gray-400">Legacy Mobile Check</span>
                                                            {isEditMode ? <select className="bg-transparent text-xs text-white outline-none" value={formData.MobileFriendly || "Unknown"} onChange={e => handleChange("MobileFriendly", e.target.value)}><option value="Unknown">Unknown</option><option value="Yes">Yes</option><option value="No">No</option></select> : <span className={`text-xs font-bold ${formData.MobileFriendly === 'No' ? 'text-red-400' : 'text-green-400'}`}>{formData.MobileFriendly || "Unknown"}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        {/* RIGHT COLUMN (Contact + Notes) */}
                                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                                            {/* Contact Card */}
                                            <div className="bg-[#111827] rounded-lg p-5 border border-white/10">
                                                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Contact Details</h3>
                                                <div className="space-y-3">
                                                    {isEditMode ? (
                                                        <div className="space-y-2">
                                                            <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.Category || ""} onChange={e => handleChange("Category", e.target.value)} placeholder="Category / Industry" />
                                                            <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.Phone || ""} onChange={e => handleChange("Phone", e.target.value)} placeholder="Phone" />
                                                            <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.Website || ""} onChange={e => handleChange("Website", e.target.value)} placeholder="Website" />
                                                            <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white" value={formData.Address || ""} onChange={e => handleChange("Address", e.target.value)} placeholder="Address" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {formData.Category && <div className="flex items-center gap-3 text-sm text-white"><div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-purple-400"><Tag size={14} /></div>{formData.Category}</div>}
                                                            {formData.Phone && <div className="flex items-center gap-3 text-sm text-white"><div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-secondary"><Phone size={14} /></div>{formData.Phone}</div>}
                                                            {formData.Website && <div className="flex items-center gap-3 text-sm text-white"><div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-blue-400"><Globe size={14} /></div><a href={formData.Website?.startsWith('http') ? formData.Website : `https://${formData.Website}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{formData.Website}</a></div>}
                                                            {formData.Address && <div className="flex items-center gap-3 text-sm text-white"><div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-gray-400"><Building2 size={14} /></div><span className="text-gray-300 text-xs">{formData.Address}</span></div>}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* NOTES SYSTEM */}
                                            <div className="bg-[#111827] rounded-lg border border-white/10 flex-1 flex flex-col overflow-hidden max-h-[500px]">
                                                <div className="p-4 border-b border-white/5 bg-white/5">
                                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <FileText size={16} /> ACTIVITY & NOTES
                                                    </h3>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                    {formData.Notes && formData.Notes.length > 0 ? (
                                                        formData.Notes.slice().reverse().map((note, i) => (
                                                            <div key={i} className="flex gap-3">
                                                                <div className="mt-1 min-w-[24px] h-6 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] text-secondary font-bold">
                                                                    {note.author[0]}
                                                                </div>
                                                                <div>
                                                                    <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-200 border border-white/5">
                                                                        {note.text}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-1 ml-1">
                                                                        {new Date(note.createdAt).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center text-gray-500 text-xs py-10">No notes yet. Start tracking interactions.</div>
                                                    )}
                                                </div>

                                                {!isEditMode && selectedLead && (
                                                    <div className="p-3 bg-black/20 border-t border-white/5">
                                                        <div className="flex gap-2">
                                                            <input
                                                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                                placeholder="Type a note..."
                                                                value={newNote}
                                                                onChange={e => setNewNote(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                                            />
                                                            <button
                                                                onClick={handleAddNote}
                                                                className="bg-secondary text-black p-2 rounded hover:bg-secondary/90 disabled:opacity-50"
                                                                disabled={!newNote.trim()}
                                                            >
                                                                <Send size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                ) : (
                                    /* --- SEO TAB CONTENT --- */
                                    <div className="grid grid-cols-12 gap-8 h-full">

                                        {/* LEFT: Summary & Action */}
                                        <div className="col-span-12 lg:col-span-5 space-y-6">

                                            {/* AI Summary Card */}
                                            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                    <Zap size={20} className="text-yellow-400" />
                                                    Executive Summary
                                                </h3>

                                                {selectedLead?.SeoAudit?.aiSummary ? (
                                                    <div className="bg-black/40 rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-line border border-white/5 font-mono">
                                                        {selectedLead.SeoAudit.aiSummary}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-lg">
                                                        {selectedLead?.SeoAudit?.raw ? (
                                                            <div className="space-y-3">
                                                                <p>Audit data available.</p>
                                                                <button
                                                                    onClick={runSeoAnalysis}
                                                                    disabled={isAnalyzingSeo}
                                                                    className="bg-secondary text-black px-4 py-2 rounded font-bold hover:bg-secondary/90 disabled:opacity-50"
                                                                >
                                                                    {isAnalyzingSeo ? "Generating Summary..." : "Generate AI Client Report"}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p>No audit data found. Please run an audit first.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Key Stats */}
                                            {selectedLead?.SeoAudit && (
                                                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                                                    <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase">Vital Signs</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 bg-black/20 rounded border border-white/5">
                                                            <div className="text-xs text-gray-500">Mobile Friendly</div>
                                                            <div className={`text-lg font-bold ${selectedLead.SeoAudit.mobileResponsive ? 'text-green-400' : 'text-red-400'}`}>
                                                                {selectedLead.SeoAudit.mobileResponsive ? 'YES' : 'NO'}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-black/20 rounded border border-white/5">
                                                            <div className="text-xs text-gray-500">Title Length</div>
                                                            <div className="text-lg font-bold text-white">
                                                                {selectedLead.SeoAudit.titleLength || 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-black/20 rounded border border-white/5">
                                                            <div className="text-xs text-gray-500">Duplicate Words</div>
                                                            <div className={`text-lg font-bold ${selectedLead.SeoAudit.titleDuplicateWords ? 'text-red-400' : 'text-green-400'}`}>
                                                                {selectedLead.SeoAudit.titleDuplicateWords || 0}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-black/20 rounded border border-white/5">
                                                            <div className="text-xs text-gray-500">H1 Tags</div>
                                                            <div className={`text-lg font-bold ${selectedLead.SeoAudit.h1Count === 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                {selectedLead.SeoAudit.h1Count || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT: Full SEO Data Dashboard */}
                                        <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-[500px] gap-6">

                                            {/* 1. Enrichment Data (NEW) */}
                                            <div className="bg-[#111827] rounded-lg border border-white/10 p-5">
                                                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase flex items-center gap-2">
                                                    <UserCheck size={16} /> Contact Discovery
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Emails Found</div>
                                                        <div className="bg-black/20 p-2 rounded min-h-[40px] text-sm text-white">
                                                            {(selectedLead?.SeoAudit?.raw?.enrichment?.emails?.length || 0) > 0 ?
                                                                selectedLead?.SeoAudit?.raw?.enrichment?.emails?.map((e: string, i: number) => <div key={i}>{e}</div>)
                                                                : <span className="text-gray-600 italic">None found</span>
                                                            }
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Phones Found</div>
                                                        <div className="bg-black/20 p-2 rounded min-h-[40px] text-sm text-white">
                                                            {(selectedLead?.SeoAudit?.raw?.enrichment?.phones?.length || 0) > 0 ?
                                                                selectedLead?.SeoAudit?.raw?.enrichment?.phones?.map((p: string, i: number) => <div key={i}>{p}</div>)
                                                                : <span className="text-gray-600 italic">None found</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <div className="text-xs text-gray-500 mb-1">Social Profiles</div>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {selectedLead?.SeoAudit?.raw?.enrichment?.socials && Object.entries(selectedLead?.SeoAudit?.raw?.enrichment?.socials || {}).length > 0 ? (
                                                            Object.entries(selectedLead?.SeoAudit?.raw?.enrichment?.socials || {}).map(([platform, url]) => (
                                                                <a key={platform} href={url as string} target="_blank" className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded border border-secondary/20 hover:bg-secondary/20 capitalize">
                                                                    {platform}
                                                                </a>
                                                            ))
                                                        ) : <span className="text-gray-600 italic text-sm">No social links detected</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Marketing Strategy (NEW) */}
                                            <div className="bg-[#111827] rounded-lg border border-white/10 p-5">
                                                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase flex items-center gap-2">
                                                    <Target size={16} /> Marketing Intelligence
                                                </h3>

                                                {/* Keywords */}
                                                <div className="mb-4">
                                                    <div className="text-xs text-gray-500 mb-2">Detected Target Keywords</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedLead?.SeoAudit?.raw?.content?.keywords?.map((kw: string, i: number) => (
                                                            <span key={i} className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                        {(!selectedLead?.SeoAudit?.raw?.content?.keywords || selectedLead.SeoAudit.raw.content.keywords.length === 0) && (
                                                            <span className="text-gray-600 italic text-sm">AI could not identify keywords</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Opportunities */}
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-2">Missing Content Opportunities</div>
                                                    <ul className="space-y-1">
                                                        {selectedLead?.SeoAudit?.raw?.content?.opportunities?.map((opp: string, i: number) => (
                                                            <li key={i} className="text-sm text-red-300 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> {opp}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* 3. Tech Stack & Meta (Existing) */}
                                            <div className="bg-[#111827] rounded-lg border border-white/10 p-5">
                                                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase flex items-center gap-2">
                                                    <Code2 size={16} /> Technical Meta
                                                </h3>
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-gray-500">Favicon</span>
                                                        <span className={selectedLead?.SeoAudit?.raw?.favicon ? "text-green-400" : "text-red-400"}>{selectedLead?.SeoAudit?.raw?.favicon ? "Found" : "Missing"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-gray-500">Charset</span>
                                                        <span className="text-white">{selectedLead?.SeoAudit?.raw?.charset ? "UTF-8" : "Unknown"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-gray-500">Viewport</span>
                                                        <span className={selectedLead?.SeoAudit?.raw?.viewport ? "text-green-400" : "text-red-400"}>{selectedLead?.SeoAudit?.raw?.viewport ? "Configured" : "Missing"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                                        <span className="text-gray-500">JS Files</span>
                                                        <span className="text-white">{selectedLead?.SeoAudit?.raw?.javascriptFiles || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(JSON.stringify(selectedLead?.SeoAudit?.raw || {}, null, 2));
                                                    alert("Copied raw JSON to clipboard");
                                                }}
                                                className="self-end text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                            >
                                                <Share2 size={12} /> Copy Raw JSON
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            {isEditMode && (
                                <div className="p-4 border-t border-white/10 bg-[#020817] flex justify-end gap-3 sticky bottom-0">
                                    <button
                                        onClick={() => { setIsEditMode(false); if (isNewLead) handleCloseModal(); }}
                                        className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 bg-secondary text-black px-6 py-2 rounded-md font-bold hover:bg-secondary/90 transition-colors"
                                    >
                                        <Save size={16} />
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- HEAD HUNTER RESULTS MODAL --- */}
                {showHuntModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Target size={20} className="text-secondary" /> Head Hunter Results
                                </h3>
                                <button onClick={() => setShowHuntModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                I found {huntResults.length} potential decision makers from LinkedIn. Select the best match to promote.
                            </p>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {huntResults.map((candidate, idx) => (
                                    <div key={idx} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex justify-between items-center group cursor-pointer" onClick={() => selectCandidate(candidate)}>
                                        <div>
                                            <div className="font-bold text-white">{candidate.name}</div>
                                            <div className="text-xs text-secondary">{candidate.role}</div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 bg-secondary text-black text-xs px-2 py-1 rounded font-bold">
                                            Select
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
