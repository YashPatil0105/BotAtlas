'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, Bot, Calendar, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BotSchedule {
  id: string;
  botCode: string;
  name: string;
  criticality: string;
  scheduleOrTrigger: string | null;
}

export default function SchedulingDashboard() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'VIEWER';
  const { toast } = useToast();
  
  const [bots, setBots] = useState<BotSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/scheduling')
      .then(res => res.json())
      .then(data => {
        if (data.bots) {
          setBots(data.bots);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleUpdateSchedule = async (botId: string, newSchedule: string) => {
    setSavingId(botId);
    try {
      const res = await fetch('/api/scheduling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, scheduleOrTrigger: newSchedule })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Schedule Updated', description: 'The run schedule was successfully updated.' });
      } else {
        toast({ title: 'Update Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to reach server.', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setBots(bots.map(b => b.id === id ? { ...b, scheduleOrTrigger: value } : b));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Job Scheduling Center
        </h1>
        <p className="text-muted-foreground text-sm max-w-3xl">
          Manage and monitor the automated run schedules and CRON triggers for all registered bots.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/85 backdrop-blur p-5 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bot Details</th>
                  <th className="px-4 py-3 font-semibold">Criticality</th>
                  <th className="px-4 py-3 font-semibold w-1/2">Execution Schedule (CRON or Trigger)</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {bots.map(bot => (
                  <tr key={bot.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="font-mono text-xs text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                          {bot.botCode}
                        </span>
                        <span className="font-semibold text-foreground">{bot.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-secondary-foreground px-2 py-1 rounded">
                        {bot.criticality}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
                          <select
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleInputChange(bot.id, e.target.value);
                              }
                            }}
                            className="bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary min-w-[140px]"
                            disabled={userRole === 'VIEWER'}
                            value={
                              ['', '0 * * * *', '0 0 * * *', '0 0 * * 0'].includes(bot.scheduleOrTrigger || '') 
                                ? bot.scheduleOrTrigger || '' 
                                : 'custom'
                            }
                          >
                            <option value="">Manual / API</option>
                            <option value="0 * * * *">Hourly</option>
                            <option value="0 0 * * *">Daily</option>
                            <option value="0 0 * * 0">Weekly</option>
                            <option value="custom">Custom Cron</option>
                          </select>
                          <input
                            type="text"
                            value={bot.scheduleOrTrigger || ''}
                            onChange={(e) => handleInputChange(bot.id, e.target.value)}
                            placeholder="e.g. 0 0 * * *"
                            className="flex-1 w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                            disabled={userRole === 'VIEWER'}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {userRole !== 'VIEWER' && (
                        <button
                          onClick={() => handleUpdateSchedule(bot.id, bot.scheduleOrTrigger || '')}
                          disabled={savingId === bot.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors font-medium text-xs disabled:opacity-50"
                        >
                          <Save className="h-3 w-3" />
                          {savingId === bot.id ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bots.length === 0 && (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                <p>No bots registered in the system yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
