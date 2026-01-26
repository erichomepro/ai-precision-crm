"use client";

import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import SkillMarketplace from "./components/SkillMarketplace";
import PulseFeed from "./components/PulseFeed";
import { db } from "../../lib/firebase_client"; // Client SDK
import { collection, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [status, setStatus] = useState("Idle");
  const [jobId, setJobId] = useState<string | null>(null);

  // Listen to the active job
  useEffect(() => {
    if (!jobId) return;

    // Type casting logic for safety would go here, simplified for brevity
    const unsub = onSnapshot(collection(db, "jobs"), (snapshot) => {
      snapshot.forEach(doc => {
        if (doc.id === jobId) {
          const data = doc.data();
          setStatus(data.status);
        }
      });
    });

    return () => unsub();
  }, [jobId]);

  return (
    <div className="flex h-screen bg-[#020817] text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 flex items-center px-6 bg-[#020817]/50 backdrop-blur-md">
          <div className="text-sm font-medium text-gray-400">Dashboard / <span className="text-white">God Mode</span></div>
        </header>

        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <div className="flex-1 min-h-[500px] bg-white/5 rounded-xl border border-white/10 relative overflow-hidden group flex flex-col">

              <div className="p-4 border-b border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder="Query (e.g., 'Plumbers in Edmonton')"
                  className="flex-1 bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
                  id="scout-query"
                />
                <button
                  onClick={async () => {
                    const queryInput = document.getElementById('scout-query') as HTMLInputElement;
                    const query = queryInput.value;
                    if (!query) return;

                    setStatus('Deploying...');

                    try {
                      const res = await fetch('/api/agents/scout', {
                        method: 'POST',
                        body: JSON.stringify({ query: query, tenantId: 'beast_mode' })
                      });
                      const data = await res.json();
                      if (data.jobId) {
                        setJobId(data.jobId);
                        setStatus('PENDING'); // Initial status
                      }
                    } catch (e) {
                      console.error(e);
                      setStatus('Error');
                    }
                  }}
                  id="scout-btn"
                  className="bg-secondary text-black font-semibold px-4 py-2 rounded-md text-sm hover:bg-secondary/90 transition-colors"
                  disabled={status === 'RUNNING'}
                >
                  {status === 'RUNNING' ? 'Scouting...' : 'Launch Scout'}
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Google_Maps_Logo_2020.svg/2275px-Google_Maps_Logo_2020.svg.png')] bg-center bg-no-repeat bg-contain filter grayscale invert"></div>

                <div className="text-center z-10 p-6 bg-black/40 backdrop-blur-sm rounded-xl border border-white/5">
                  <div className="text-4xl mb-2">🗺️</div>
                  <h3 className="text-xl font-bold text-white">God Mode Map View</h3>
                  <p className="text-sm text-gray-400">
                    Status: <span className="text-secondary">{status}</span>
                  </p>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-[#020817]/80 backdrop-blur-md border border-white/10 p-4 rounded-lg">
                  <SkillMarketplace />
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <PulseFeed />
            <div className="bg-gradient-to-br from-secondary/20 to-transparent rounded-xl border border-secondary/20 p-6">
              <h3 className="text-lg font-bold text-white mb-1">Total Leads</h3>
              <div className="text-4xl font-bold text-secondary">1,248</div>
              <div className="text-xs text-gray-400 mt-2">+12% from last week</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
