'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, RefreshCw, GitCompare } from 'lucide-react';

function CompareBotsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [bots, setBots] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState(searchParams.get('sourceId') || '');
  const [targetId, setTargetId] = useState(searchParams.get('targetId') || '');
  
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    fetch('/api/bots').then(r => r.json()).then(data => setBots(data.bots || []));
  }, []);

  const triggerCompare = async (src: string, tgt: string) => {
    if (!src || !tgt) return;
    if (src === tgt) {
      toast({ title: 'Invalid Selection', description: 'Please select two different bots', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/compare?sourceId=${src}&targetId=${tgt}`);
      if (res.ok) {
        setComparison(await res.json());
      } else {
        toast({ title: 'Comparison Failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sourceId && targetId) {
      triggerCompare(sourceId, targetId);
    }
  }, [sourceId, targetId]);

  const handleCompare = () => {
    triggerCompare(sourceId, targetId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/reuse')} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bot Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">Side-by-side structural analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border/50 rounded-xl p-6">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Source Bot</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="">Select a bot...</option>
            {bots.map(b => <option key={b.id} value={b.id}>{b.name} ({b.botCode})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Target Bot</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="">Select a bot...</option>
            {bots.map(b => <option key={b.id} value={b.id}>{b.name} ({b.botCode})</option>)}
          </select>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button onClick={handleCompare} disabled={loading || !sourceId || !targetId} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </button>
        </div>
      </div>

      {comparison && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card border border-border/50 rounded-xl p-6 text-center">
            <h2 className="text-lg font-bold mb-2">Structural Similarity</h2>
            <div className="flex justify-center items-center gap-4">
              <div className="text-4xl font-extrabold text-blue-500">{comparison.similarityScore}%</div>
              <div className="text-sm text-muted-foreground text-left">
                <p>{comparison.exactMatches} exact matching steps found.</p>
                <p>Source: {comparison.totalStepsSource} steps | Target: {comparison.totalStepsTarget} steps</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-border/50 bg-muted/20">
                <h3 className="font-semibold">{comparison.sourceBot.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{comparison.sourceBot.botCode}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comparison.sourceBot.steps.map((s: any, i: number) => {
                  const hasMatch = comparison.targetBot.steps.some((t: any) => t.actionType === s.actionType && t.systemName?.toLowerCase() === s.systemName?.toLowerCase());
                  return (
                    <div key={s.id} className={`p-4 rounded-lg border flex items-start gap-4 ${hasMatch ? 'border-green-500/30 bg-green-500/5' : 'border-border/50 bg-background/50'}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${hasMatch ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider">{s.actionType.replace(/_/g, ' ')}</span>
                          {s.systemName && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{s.systemName}</span>}
                        </div>
                        <p className="text-sm text-foreground/80">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-border/50 bg-muted/20">
                <h3 className="font-semibold">{comparison.targetBot.name}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{comparison.targetBot.botCode}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comparison.targetBot.steps.map((s: any, i: number) => {
                  const hasMatch = comparison.sourceBot.steps.some((t: any) => t.actionType === s.actionType && t.systemName?.toLowerCase() === s.systemName?.toLowerCase());
                  return (
                    <div key={s.id} className={`p-4 rounded-lg border flex items-start gap-4 ${hasMatch ? 'border-green-500/30 bg-green-500/5' : 'border-border/50 bg-background/50'}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${hasMatch ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wider">{s.actionType.replace(/_/g, ' ')}</span>
                          {s.systemName && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{s.systemName}</span>}
                        </div>
                        <p className="text-sm text-foreground/80">{s.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompareBotsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground animate-pulse">Loading comparison...</div>}>
      <CompareBotsContent />
    </Suspense>
  );
}
