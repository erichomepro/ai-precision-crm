"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from "../components/Sidebar";
import { db } from "../../../lib/firebase_client";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, arrayUnion } from "firebase/firestore";
import { Phone, Mail, MapPin, Building2, User, X, Trash2, Edit2, Save, Plus, FileText, Send, Briefcase, Tag, Linkedin, CircuitBoard, Loader2, Search } from 'lucide-react';

interface Note {
    id?: string;
    text: string;
    createdAt: string;
    author: string;
}

interface Client {
    id: string;
    FirstName?: string;
    LastName?: string;
    Role?: string; // e.g. CEO, Owner
    Status?: string; // Scraped, Outreach, Meeting, Client, Closed
    Phone?: string;
    Email?: string;
    Address?: string;
    City?: string;
    Country?: string;
    Company?: string;
    Category?: string;
    Notes?: Note[];
    LinkedinProfile?: string;

    // Enrichment Data
    Headline?: string;
    Bio?: string;
    IsEnriched?: boolean;

    createdAt?: string;
    [key: string]: any;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isNewClient, setIsNewClient] = useState(false);

    // Enrichment State
    const [isEnriching, setIsEnriching] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Client>>({});

    // New Note State
    const [newNote, setNewNote] = useState("");

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Derived State
    const categories = ['All', ...Array.from(new Set(clients.map(c => c.Category).filter(Boolean)))];

    const filteredClients = clients.filter(client => {
        const matchesSearch = (client.FirstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (client.LastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (client.Company?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || client.Category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        const q = query(
            collection(db, "clients"),
            orderBy("createdAt", "desc"),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedClients: Client[] = [];
            snapshot.forEach((doc) => {
                fetchedClients.push({ id: doc.id, ...doc.data() } as Client);
            });
            setClients(fetchedClients);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRowClick = (client: Client) => {
        setSelectedClient(client);
        setFormData(client);
        setIsEditMode(false);
        setIsNewClient(false);
        setNewNote("");
        setIsEnriching(false);
    };

    const handleAddNew = () => {
        const newClient: Partial<Client> = {
            FirstName: "",
            LastName: "",
            Role: "Owner",
            Status: "Scraped",
            Phone: "",
            Email: "",
            Address: "Edmonton, AB",
            Company: "",
            Notes: []
        };
        setSelectedClient(null);
        setFormData(newClient);
        setIsEditMode(true);
        setIsNewClient(true);
    };

    const handleCloseModal = () => {
        setSelectedClient(null);
        setIsEditMode(false);
        setIsNewClient(false);
    };

    const handleDelete = async () => {
        if (!selectedClient?.id) return;
        if (!window.confirm("Are you sure you want to delete this client?")) return;

        try {
            await deleteDoc(doc(db, "clients", selectedClient.id));
            handleCloseModal();
        } catch (e) {
            console.error("Error deleting client: ", e);
            alert("Failed to delete client.");
        }
    };

    const handleSave = async () => {
        try {
            if (isNewClient) {
                await addDoc(collection(db, "clients"), {
                    ...formData,
                    createdAt: new Date().toISOString()
                });
            } else {
                if (!selectedClient?.id) return;
                await updateDoc(doc(db, "clients", selectedClient.id), {
                    ...formData
                });
            }
            handleCloseModal();
        } catch (e) {
            console.error("Error saving client: ", e);
            alert("Failed to save client.");
        }
    };

    const handleEnrich = async () => {
        if (!formData.LinkedinProfile) {
            alert("This client needs a LinkedIn URL (from Step 1) to run Enrichment.");
            return;
        }

        setIsEnriching(true);
        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkedinUrl: formData.LinkedinProfile })
            });
            const data = await res.json();

            if (data.profile) {
                // Update local form state with enriched data
                setFormData(prev => ({
                    ...prev,
                    FirstName: prev.FirstName || data.profile.firstName,
                    LastName: prev.LastName || data.profile.lastName,
                    Headline: data.profile.headline,
                    Bio: data.profile.summary,
                    City: data.profile.city,
                    Country: data.profile.countryCode,
                    Role: data.profile.title || prev.Role,
                    Company: data.profile.company || prev.Company,
                    IsEnriched: true
                }));
                alert(`Enrichment Complete! Found details for ${data.profile.firstName}. Review and Save.`);
                setIsEditMode(true); // Switch to edit mode so user can see/save changes
            } else {
                alert("Enrichment ran but returned no data.");
            }
        } catch (e) {
            console.error("Enrichment Failed", e);
            alert("Enrichment Agent failed to connect.");
        } finally {
            setIsEnriching(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedClient?.id) return;

        const note: Note = {
            text: newNote,
            createdAt: new Date().toISOString(),
            author: "User"
        };

        try {
            await updateDoc(doc(db, "clients", selectedClient.id), {
                Notes: arrayUnion(note)
            });

            const updatedNotes = [...(formData.Notes || []), note];
            setFormData(prev => ({ ...prev, Notes: updatedNotes }));
            setSelectedClient(prev => prev ? ({ ...prev, Notes: updatedNotes }) : null);
            setNewNote("");
        } catch (e) {
            console.error("Failed to add note", e);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Client': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Meeting Booked': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'Reached Out': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Closed/Lost': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="flex h-screen bg-[#020817] text-white font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto relative">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Client Lead Manager</h1>
                        <p className="text-gray-400 mt-1">Manage individual contacts and enrichment pipelines.</p>

                        {/* Search & Filter Bar */}
                        <div className="flex gap-4 mt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-secondary min-w-[300px]"
                                />
                            </div>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-secondary"
                            >
                                {categories.map(cat => (
                                    <option key={cat as string} value={cat as string}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-secondary text-black px-4 py-2 rounded-md font-semibold hover:bg-secondary/90 transition-colors"
                    >
                        <Plus size={18} />
                        Add Client
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64 border border-white/10 rounded-xl bg-white/5 animate-pulse">
                        <span className="text-gray-400">Loading Clients...</span>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 border border-white/10 rounded-xl bg-white/5 border-dashed">
                        <div className="p-4 rounded-full bg-white/10 mb-4">
                            <User size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white">No Clients Found</h3>
                        <p className="text-gray-400 mt-2 max-w-md text-center">
                            Promote leads from the Head Hunter log to see them here.
                        </p>
                    </div>
                ) : (
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0B1221]">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4">Company</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        onClick={() => handleRowClick(client)}
                                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {client.IsEnriched && (
                                                    <span title="Enriched">
                                                        <CircuitBoard size={12} className="text-secondary" />
                                                    </span>
                                                )}
                                                {client.FirstName} {client.LastName}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">{client.Role || "Unknown Role"}</div>
                                            {client.Category && (
                                                <div className="text-xs text-secondary mt-0.5 flex items-center gap-1 font-medium">
                                                    <Tag size={10} />
                                                    {client.Category}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${getStatusColor(client.Status)}`}>
                                                {client.Status || "Scraped"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {client.Phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Phone size={12} className="text-secondary" />
                                                        {client.Phone}
                                                    </div>
                                                )}
                                                {client.Email && (
                                                    <div className="flex items-center gap-2 text-sm text-blue-400">
                                                        <Mail size={12} />
                                                        {client.Email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <MapPin size={12} />
                                                <span className="truncate max-w-[200px]">{client.Address || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <Building2 size={12} />
                                                {client.Company || "Independent"}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- CLIENT DETAILS MODAL --- */}
                {(selectedClient || isNewClient) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0B1221] border border-white/10 rounded-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">

                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-[#020817]">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                        {isEditMode ? (
                                            isNewClient ? "Add New Client" : "Edit Client"
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-secondary text-black flex items-center justify-center font-bold text-sm">
                                                    {formData.FirstName?.[0]}{formData.LastName?.[0]}
                                                </div>
                                                <span>{formData.FirstName} {formData.LastName}</span>
                                                {formData.IsEnriched && <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded flex items-center gap-1"><CircuitBoard size={10} /> Enriched</span>}
                                            </div>
                                        )}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <p className="text-sm text-gray-400">ID: {selectedClient?.id || "New"}</p>
                                        {!isEditMode && selectedClient?.Status && (
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${getStatusColor(selectedClient.Status)}`}>
                                                {selectedClient.Status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!isEditMode ? (
                                        <>
                                            <button
                                                onClick={() => setIsEditMode(true)}
                                                className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="p-2 hover:bg-red-500/10 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => { setIsEditMode(false); if (isNewClient) handleCloseModal(); }}
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

                            {/* Form Body */}
                            <div className="p-6 grid grid-cols-12 gap-8">

                                {/* LEFT: Info */}
                                <div className="col-span-12 lg:col-span-8 space-y-8">

                                    {/* 1. CORE IDENTITY */}
                                    <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                                                <User size={16} /> Identity & Enrichment
                                            </h3>

                                            {/* ENRICH BUTTON (STEP 2) */}
                                            {(!isNewClient) && (
                                                <button
                                                    onClick={handleEnrich}
                                                    disabled={isEnriching || !formData.LinkedinProfile}
                                                    className="flex items-center gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <CircuitBoard size={14} />}
                                                    {isEnriching ? "Enriching Agent Running..." : "Run Enrichment (Step 2)"}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">First Name</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.FirstName || ""}
                                                        onChange={e => handleChange("FirstName", e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="text-white">{formData.FirstName}</div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Last Name</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.LastName || ""}
                                                        onChange={e => handleChange("LastName", e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="text-white">{formData.LastName}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1 mt-4">
                                            <label className="text-xs text-gray-500">Category / Industry</label>
                                            {isEditMode ? (
                                                <input
                                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                    value={formData.Category || ""}
                                                    onChange={e => handleChange("Category", e.target.value)}
                                                    placeholder="e.g. Real Estate, Dental"
                                                />
                                            ) : (
                                                formData.Category ? (
                                                    <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-xs">
                                                        <Tag size={10} /> {formData.Category}
                                                    </span>
                                                ) : <span className="text-gray-600 text-xs italic">Uncategorized</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">LinkedIn URL</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.LinkedinProfile || ""}
                                                        onChange={e => handleChange("LinkedinProfile", e.target.value)}
                                                        placeholder="https://linkedin.com/in/..."
                                                    />
                                                ) : (
                                                    formData.LinkedinProfile ? <a href={formData.LinkedinProfile} target="_blank" className="text-blue-400 text-sm hover:underline flex items-center gap-1"><Linkedin size={12} /> View Profile</a> : <span className="text-gray-500 text-sm">Missing Link</span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Pipeline Status</label>
                                                {isEditMode ? (
                                                    <select
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.Status || "Scraped"}
                                                        onChange={e => handleChange("Status", e.target.value)}
                                                    >
                                                        <option value="Scraped">Scraped Lead</option>
                                                        <option value="Reached Out">Reached Out</option>
                                                        <option value="Meeting Booked">Meeting Booked</option>
                                                        <option value="Client">Client</option>
                                                        <option value="Closed/Lost">Closed/Lost</option>
                                                    </select>
                                                ) : (
                                                    <div className="text-white">{formData.Status || "Scraped"}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. ENRICHED DETAILS */}
                                    <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Briefcase size={16} /> Professional Profile
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Headline</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.Headline || ""}
                                                        onChange={e => handleChange("Headline", e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="text-white font-medium italic">"{formData.Headline || "No headline fetched"}"</div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Summary / Bio</label>
                                                {isEditMode ? (
                                                    <textarea
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors h-24"
                                                        value={formData.Bio || ""}
                                                        onChange={e => handleChange("Bio", e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">{formData.Bio || "No fetching bio."}</div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500">Company</label>
                                                    {isEditMode ? (
                                                        <input className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={formData.Company || ""} onChange={e => handleChange("Company", e.target.value)} />
                                                    ) : <div className="text-white">{formData.Company || "-"}</div>}
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500">Location</label>
                                                    {isEditMode ? (
                                                        <div className="flex gap-2">
                                                            <input className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={formData.City || ""} onChange={e => handleChange("City", e.target.value)} placeholder="City" />
                                                            <input className="w-16 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white" value={formData.Country || ""} onChange={e => handleChange("Country", e.target.value)} placeholder="CC" />
                                                        </div>
                                                    ) : <div className="text-white">{formData.City ? `${formData.City}, ${formData.Country || ""}` : "-"}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. CONTACT INFO (Step 3 Placeholder) */}
                                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 opacity-75">
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Mail size={16} /> Contact (Step 3)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Email</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.Email || ""}
                                                        onChange={e => handleChange("Email", e.target.value)}
                                                        placeholder="Run Step 3 to find email..."
                                                    />
                                                ) : (
                                                    <a href={`mailto:${formData.Email}`} className="text-blue-400 hover:underline">
                                                        {formData.Email || "Unknown"}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-500">Phone</label>
                                                {isEditMode ? (
                                                    <input
                                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary transition-colors"
                                                        value={formData.Phone || ""}
                                                        onChange={e => handleChange("Phone", e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="text-gray-300">{formData.Phone || "N/A"}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* RIGHT: Notes */}
                                <div className="col-span-12 lg:col-span-4">
                                    {/* NOTES SYSTEM */}
                                    <div className="bg-[#111827] rounded-lg border border-white/10 flex flex-col overflow-hidden h-full max-h-[600px]">
                                        <div className="p-4 border-b border-white/5 bg-white/5">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <FileText size={16} /> CLIENT NOTES
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
                                                <div className="text-center text-gray-500 text-xs py-10">No notes yet.</div>
                                            )}
                                        </div>

                                        {!isEditMode && selectedClient && (
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

                            {/* Footer Actions */}
                            {isEditMode && (
                                <div className="p-4 border-t border-white/10 bg-[#020817] flex justify-end gap-3 sticky bottom-0">
                                    <button
                                        onClick={() => { setIsEditMode(false); if (isNewClient) handleCloseModal(); }}
                                        className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 bg-secondary text-black px-6 py-2 rounded-md font-bold hover:bg-secondary/90 transition-colors"
                                    >
                                        <Save size={16} />
                                        Save Client
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
