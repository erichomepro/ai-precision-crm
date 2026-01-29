"use client";
import React, { useEffect, useState } from 'react';
import { db } from "../../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, arrayUnion, writeBatch, where } from "firebase/firestore";
import { Phone, Globe, Star, AlertCircle, Building2, X, Trash2, Edit2, Save, Plus, BarChart3, Clock, Share2, Smartphone, Zap, Search, UserCheck, Linkedin, Briefcase, Code2, FileText, Send, Facebook, Instagram, Twitter, MapPin, Target, Loader2, Camera, Tag } from 'lucide-react';
import { useAuth } from "@/context/auth-context";
import ScoutLauncher from "../../headhunter/ScoutLauncher";
import { Rocket } from 'lucide-react';

interface Note {
    id?: string;
    text: string;
    createdAt: string;
    author: string;
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
    userId?: string;

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
    PostFrequency?: string;

    // Notes
    Notes?: Note[];
    Category?: string;
    City?: string;

    [key: string]: any;

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
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isNewLead, setIsNewLead] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'seo'>('details');

    const [isAnalyzingSeo, setIsAnalyzingSeo] = useState(false);
    const [isHunting, setIsHunting] = useState(false);
    const [huntResults, setHuntResults] = useState<Candidate[]>([]);
    const [showHuntModal, setShowHuntModal] = useState(false);
    const [isScrapingSocial, setIsScrapingSocial] = useState(false);

    const [formData, setFormData] = useState<Partial<Lead>>({});
    const [newNote, setNewNote] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedCity, setSelectedCity] = useState("All");
    const [showScoutModal, setShowScoutModal] = useState(false);

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
        if (!user) return;

        // Fetch leads belonging to THIS user
        const q = query(
            collection(db, "leads"),
            where("userId", "==", user.uid),
            orderBy("scoutedAt", "desc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedLeads: Lead[] = [];
                snapshot.forEach((doc) => {
                    fetchedLeads.push({ id: doc.id, ...doc.data() } as Lead);
                });
                setLeads(fetchedLeads);
                setLoading(false);
            },
            (error) => {
                console.error("Firestore Error:", error);
                setLoading(false);
                // Optional: set an error state here to show in UI
            }
        );

        return () => unsubscribe();
    }, [user]);

    // ... actions (handleRowClick, handleSave, etc) need to ensure userId is saved ...

    const handleSave = async () => {
        try {
            if (isNewLead) {
                await addDoc(collection(db, "leads"), {
                    ...formData,
                    userId: user?.uid, // KEY: Scope to user
                    scoutedAt: new Date().toISOString(),
                    source: "Manual Entry"
                });
            } else {
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

    const handleRowClick = (lead: Lead) => {
        setSelectedLead(lead);
        setFormData(lead);
        setIsEditMode(false);
        setIsNewLead(false);
        setNewNote("");
        setHuntResults([]);
        setShowHuntModal(false);
        setActiveTab('details');
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
        setIsEditMode(false);
        setIsNewLead(false);
    };

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Leads Pipeline</h1>
                    <p className="text-gray-400 mt-1">Manage your high-value business relationships.</p>

                    <div className="flex gap-4 mt-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 min-w-[300px] transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowScoutModal(true)}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all text-sm"
                    >
                        <Rocket size={18} className="text-blue-400" />
                        Lead Bot (Scout)
                    </button>
                    <button
                        onClick={() => {
                            const newLead: Partial<Lead> = {
                                BusinessName: "",
                                Address: "",
                                Phone: "",
                                Website: "",
                                Rating: "0.0",
                                ViabilityScore: "Low",
                                OwnerName: "",
                                ReviewsCount: "0",
                                Notes: []
                            };
                            setSelectedLead(null);
                            setFormData(newLead);
                            setIsEditMode(true);
                            setIsNewLead(true);
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-900/40 transition-all text-sm"
                    >
                        <Plus size={18} />
                        Add New Lead
                    </button>
                </div>
            </div>

            {/* Scout Modal */}
            {showScoutModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-[32px] w-full max-w-xl p-8 shadow-2xl relative">
                        <button
                            onClick={() => setShowScoutModal(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <Rocket className="text-blue-500" />
                                Deploy Lead Scouter
                            </h2>
                            <p className="text-gray-400 mt-2">Enter a business type and city to find leads automatically.</p>
                        </div>

                        <ScoutLauncher />

                        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <p className="text-[11px] text-blue-400 font-medium">
                                💡 Tip: Scouting runs in the background. Results will appear in your "Head Hunter" staging area within 2-3 minutes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 border border-white/5 rounded-3xl bg-white/[0.02] space-y-4">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <span className="text-gray-500 font-medium">Syncing Brain Data...</span>
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <div className="p-6 rounded-full bg-white/5 mb-6 opacity-30">
                        <Building2 size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-300">No Leads Yet</h3>
                    <p className="text-gray-500 mt-2 max-w-sm text-center">
                        Start by adding a lead manually or running a scout campaign.
                    </p>
                </div>
            ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-5">Business Intelligence</th>
                                <th className="px-6 py-5">Contact Node</th>
                                <th className="px-6 py-5">Reputation</th>
                                <th className="px-6 py-5">Scoring</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.map((lead) => (
                                <tr
                                    key={lead.id}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => handleRowClick(lead)}
                                >
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-white text-base">
                                            {lead.BusinessName || "Named Entity"}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <MapPin size={10} /> {lead.City || lead.Address || "Global"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 space-y-1">
                                        {lead.Phone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <Phone size={12} className="text-purple-400" />
                                                {lead.Phone}
                                            </div>
                                        )}
                                        {lead.Website && (
                                            <div className="flex items-center gap-2 text-sm text-blue-400">
                                                <Globe size={12} />
                                                <span className="truncate max-w-[150px]">{lead.Website.replace(/^https?:\/\//, '')}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5">
                                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                            <span className="font-bold">{lead.Rating || "0.0"}</span>
                                            <span className="text-[10px] text-gray-600 italic">({lead.ReviewsCount || "0"} reviews)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${lead.ViabilityScore?.includes("High")
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-gray-500/10 border-white/10 text-gray-500'}`}>
                                            {lead.ViabilityScore || "Calculating..."}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal - Simplified for migration demo */}
            {(selectedLead || isNewLead) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black mb-6">{isNewLead ? "New Strategic Lead" : "Lead Profile"}</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-500">Business Name</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50"
                                        value={formData.BusinessName}
                                        onChange={(e) => setFormData({ ...formData, BusinessName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-gray-500">Website</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500/50"
                                        value={formData.Website}
                                        onChange={(e) => setFormData({ ...formData, Website: e.target.value })}
                                    />
                                </div>
                            </div>
                            {/* More fields... */}
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={handleCloseModal} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 py-3 rounded-xl font-black shadow-lg shadow-purple-900/20">Save Intelligence</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
