'use client';

import { useState } from 'react';
import { launchScout } from '../actions/scout';
import { Rocket, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export default function ScoutLauncher() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleLaunch(formData: FormData) {
        if (!user) {
            setMessage("❌ You must be logged in to launch a scout.");
            return;
        }

        setIsLaunching(true);
        setMessage(null);

        // Add userId to formData
        formData.append('userId', user.uid);

        const result = await launchScout(formData);

        if (result.success) {
            setMessage(`🚀 Scout Deployed! Job ID: ${result.jobId}`);
            setQuery(''); // Clear input
        } else {
            setMessage(`❌ Error: ${result.message}`);
        }

        setIsLaunching(false);
    }

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Rocket className="text-blue-400" />
                Launch New Mission
            </h2>

            <form action={handleLaunch} className="flex gap-4 items-center">
                <input
                    name="query"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. 'Plumbers in Edmonton' or 'Marketing Agencies in Texas'"
                    className="flex-1 bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />

                <button
                    type="submit"
                    disabled={isLaunching}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center gap-2"
                >
                    {isLaunching ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Launching...
                        </>
                    ) : (
                        <>
                            <Rocket size={20} />
                            Deploy Scout
                        </>
                    )}
                </button>
            </form>

            {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-mono ${message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}
