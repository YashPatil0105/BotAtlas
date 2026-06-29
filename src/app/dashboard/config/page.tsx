'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Plus, X, UserCog, Mail, Bot, Settings, AlertCircle } from 'lucide-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface BotRecord {
  id: string;
  botCode: string;
  name: string;
}

interface AssignmentRecord {
  id: string;
  bot: {
    id: string;
    botCode: string;
    name: string;
  };
}

export default function ConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [assignedBots, setAssignedBots] = useState<AssignmentRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBots, setLoadingBots] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'VIEWER', password: '' });
  const [addingUser, setAddingUser] = useState(false);

  // Bot Assignment Form State
  const [selectedBotId, setSelectedBotId] = useState('');
  const [assigningBot, setAssigningBot] = useState(false);

  // Role Guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (session?.user && (session.user as any).role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user && (session.user as any).role === 'ADMIN') {
      fetchUsers();
      fetchBots();
    }
  }, [session]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchBots = async () => {
    setLoadingBots(true);
    try {
      // Fetch a larger limit to list bots for assignment
      const res = await fetch('/api/bots?limit=100');
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBots(false);
    }
  };

  const fetchAssignments = async (userId: string) => {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/users/${userId}/assignments`);
      if (res.ok) {
        setAssignedBots(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSelectUser = (user: UserRecord) => {
    setSelectedUser(user);
    fetchAssignments(user.id);
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    setAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        toast({ title: 'User created', description: 'User has been successfully added.' });
        setNewUser({ name: '', email: '', role: 'VIEWER', password: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to add user.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast({ title: 'Role updated' });
        fetchUsers();
        // Update selected user role locally if needed
        if (selectedUser?.id === id) {
          setSelectedUser(prev => prev ? { ...prev, role } : null);
        }
      } else {
        toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'User removed' });
        if (selectedUser?.id === id) {
          setSelectedUser(null);
          setAssignedBots([]);
        }
        fetchUsers();
      } else {
        toast({ title: 'Error', description: 'Failed to remove user.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleAssignBot = async () => {
    if (!selectedUser || !selectedBotId) return;
    setAssigningBot(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botIds: [selectedBotId] }),
      });
      if (res.ok) {
        toast({ title: 'Bot assigned', description: 'Successfully assigned bot to the user.' });
        setSelectedBotId('');
        fetchAssignments(selectedUser.id);
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to assign bot.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setAssigningBot(false);
    }
  };

  const handleRemoveAssignment = async (botId: string) => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/assignments?botId=${botId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Assignment removed' });
        fetchAssignments(selectedUser.id);
      } else {
        toast({ title: 'Error', description: 'Failed to remove assignment.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  if (status === 'loading') {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
  }

  if (!session || (session.user as any).role !== 'ADMIN') {
    return null;
  }

  // Filter out bots that are already assigned to the selected user
  const assignableBots = bots.filter(
    bot => !assignedBots.some(assignment => assignment.bot.id === bot.id)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Admin Settings & Configurations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user access, configure roles, and assign bots to reviewers and viewers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Add User Form */}
        <div className="col-span-1 space-y-6">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <UserCog className="h-4 w-4 text-primary" /> Add New User
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. jane@company.com"
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Temporary Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option value="VIEWER">Viewer (Read-only)</option>
                  <option value="REVIEWER">Reviewer (Edit assigned)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>
              <button
                onClick={handleAddUser}
                disabled={addingUser || !newUser.name || !newUser.email || !newUser.password}
                className="w-full flex justify-center items-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {addingUser ? 'Creating...' : <><Plus className="h-4 w-4" /> Add User</>}
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column: Users List */}
        <div className="col-span-1 rounded-xl border border-border/50 bg-card flex flex-col h-[600px] overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" /> Platform Users ({users.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loadingUsers ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
            ) : (
              users.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-4 flex flex-col gap-2 hover:bg-white/5 transition-colors cursor-pointer ${
                    selectedUser?.id === u.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(u.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Added {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                    <select
                      value={u.role}
                      onClick={(e) => e.stopPropagation()}
                      onChange={e => handleUpdateRole(u.id, e.target.value)}
                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 border-0 focus:outline-none cursor-pointer ${
                        u.role === 'ADMIN' ? 'bg-red-500/15 text-red-400' :
                        u.role === 'REVIEWER' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                      }`}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Bot Assignment */}
        <div className="col-span-1 rounded-xl border border-border/50 bg-card flex flex-col h-[600px] overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" /> Bot Assignments
            </h2>
          </div>
          
          {selectedUser ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground">
                  Assign bots to <span className="text-primary font-bold">{selectedUser.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Role: <span className="font-mono text-primary">{selectedUser.role}</span>
                </p>
              </div>

              {selectedUser.role === 'ADMIN' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-lg border border-dashed border-border/50">
                  <Shield className="h-10 w-10 text-red-400 mb-2" />
                  <p className="text-sm font-medium">Admin Full Access</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Administrators have access to all bots in the registry by default. Assignments are not needed.
                  </p>
                </div>
              ) : selectedUser.role === 'VIEWER' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-lg border border-dashed border-border/50">
                  <Shield className="h-10 w-10 text-blue-400 mb-2" />
                  <p className="text-sm font-medium">Viewer Full Access (Read-only)</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Viewers have read-only access to all bots in the registry by default. Assignments are not needed.
                  </p>
                </div>
              ) : (
                <>
                  {/* Assignment Select */}
                  <div className="flex gap-2 mb-4">
                    <select
                      value={selectedBotId}
                      onChange={e => setSelectedBotId(e.target.value)}
                      className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="">Select bot to assign...</option>
                      {assignableBots.map(bot => (
                        <option key={bot.id} value={bot.id}>
                          {bot.botCode} - {bot.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignBot}
                      disabled={assigningBot || !selectedBotId}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {assigningBot ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>

                  {/* Assigned Bots List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/50 rounded-lg border border-border/50 bg-background/50">
                    {loadingAssignments ? (
                      <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading assignments...</div>
                    ) : assignedBots.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                        <span>No bots assigned yet.</span>
                      </div>
                    ) : (
                      assignedBots.map(assignment => (
                        <div key={assignment.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors group">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-primary font-semibold block">{assignment.bot.botCode}</span>
                            <span className="text-xs text-foreground font-medium truncate block max-w-[180px]" title={assignment.bot.name}>
                              {assignment.bot.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(assignment.bot.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove assignment"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No User Selected</p>
              <p className="text-xs max-w-[200px] mt-1">
                Select a user from the middle column to manage their bot assignments.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
