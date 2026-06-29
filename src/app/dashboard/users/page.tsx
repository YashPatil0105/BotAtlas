'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Plus, X, UserCog, Mail } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'VIEWER', password: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    setAdding(true);
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
      setAdding(false);
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
      } else {
        toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'User removed' });
        fetchUsers();
      } else {
        toast({ title: 'Error', description: 'Failed to remove user.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform access and roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 rounded-xl border border-border/50 bg-card p-5 h-fit">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><UserCog className="h-4 w-4 text-primary" /> Add New User</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Temporary Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="VIEWER">Viewer</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button onClick={handleAddUser} disabled={adding || !newUser.name || !newUser.email || !newUser.password}
              className="w-full flex justify-center items-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {adding ? 'Adding...' : <><Plus className="h-4 w-4" /> Add User</>}
            </button>
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400" /> Active Users ({users.length})</h2>
          </div>
          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <select value={u.role} onChange={e => handleUpdateRole(u.id, e.target.value)}
                      className={`text-xs font-semibold rounded-md px-2 py-1 border-0 focus:outline-none cursor-pointer ${
                        u.role === 'ADMIN' ? 'bg-red-500/15 text-red-400' :
                        u.role === 'REVIEWER' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400'
                      }`}>
                      <option value="ADMIN">Admin</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button onClick={() => handleDelete(u.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
