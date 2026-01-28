"use client";

import { useState } from "react";
import { Plus, Code, Eye, Save } from "lucide-react";

export default function FormBuilder() {
    const [fields, setFields] = useState([
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "company", label: "Company Name", type: "text", required: true }
    ]);
    const [previewMode, setPreviewMode] = useState(false);

    const addField = () => {
        const id = `field_${fields.length + 1}`;
        setFields([...fields, { id, label: "New Field", type: "text", required: false }]);
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Form Builder</h2>
                    <p className="text-xs text-gray-400">Design lead capture forms for your clients.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        className="p-2 rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                        title="Toggle Preview"
                    >
                        {previewMode ? <Code size={18} /> : <Eye size={18} />}
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-secondary text-black font-semibold rounded text-sm hover:bg-secondary/90">
                        <Save size={16} /> Save
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {previewMode ? (
                    <form className="space-y-4 p-4 bg-white rounded-lg max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Contact Us</h3>
                        {fields.map((field, i) => (
                            <div key={i}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                                    placeholder={field.label}
                                />
                            </div>
                        ))}
                        <button className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
                            Submit
                        </button>
                    </form>
                ) : (
                    <div className="space-y-3">
                        {fields.map((field, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-black/20 rounded border border-white/5 group">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <input
                                        value={field.label}
                                        onChange={(e) => {
                                            const newFields = [...fields];
                                            newFields[i].label = e.target.value;
                                            setFields(newFields);
                                        }}
                                        className="bg-transparent border-b border-white/10 text-sm text-white focus:outline-none focus:border-white/40"
                                    />
                                    <select
                                        value={field.type}
                                        onChange={(e) => {
                                            const newFields = [...fields];
                                            newFields[i].type = e.target.value;
                                            setFields(newFields);
                                        }}
                                        className="bg-black/40 border border-white/10 rounded text-xs text-gray-300 focus:outline-none"
                                    >
                                        <option value="text">Text</option>
                                        <option value="email">Email</option>
                                        <option value="number">Number</option>
                                        <option value="textarea">Long Text</option>
                                    </select>
                                </div>
                                <div className="text-xs text-gray-500">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => {
                                                const newFields = [...fields];
                                                newFields[i].required = e.target.checked;
                                                setFields(newFields);
                                            }}
                                        /> Req
                                    </label>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addField}
                            className="w-full py-3 border border-dashed border-white/20 rounded-lg text-gray-500 hover:text-white hover:border-white/40 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus size={16} /> Add Field
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
