'use client';

import { useState, useMemo, useRef } from 'react';
import { Search, Download, Filter, UserCheck, Shield, Laptop, Building2, Upload, FileSpreadsheet, Plus, MoreHorizontal, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// Initial Mock data
const INITIAL_DATA = [
  { sr: 1, name: 'Rashmi Pandit', id: '1000733', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'HP Notebook i3', assetId: 'USFBLT0004525', pam: 'No', finnacle: 'No', approvedBy: 'Shantanu Sir', status: '', remarks: '', software: '' },
  { sr: 2, name: 'Shashikiran Jugalkar', id: '1010931', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'HP Notebook i3', assetId: 'USFBLT0003919', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 3, name: 'Sunuk Kumar', id: '1009239', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'HP Notebook i3', assetId: 'USFBLT000...', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 4, name: 'Prashant Jaiswal', id: '1008430', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'HP Notebook i3', assetId: 'USFBLT0003134', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 5, name: 'Petal Valladares', id: '1008060', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'HP Notebook i3', assetId: 'USFBLT0003870', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 6, name: 'Kiran M', id: '1009041', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0006705', pam: 'Yes', finnacle: 'Only UAT Access', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 7, name: 'Amit Sinha', id: '1005484', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0008098', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 8, name: 'Vansh Bhat', id: '1014147', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007984', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 9, name: 'Yash Patil', id: '1014151', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', laptopModel: 'N/A', assetId: 'N/A', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 11, name: 'Rohit Sanjay Hirurkar', id: 'T002178', dept: 'BPR&HA', type: 'Vendor', vendor: 'Orient Tech', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007926', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 13, name: 'Praful Manjare', id: 'T002073', dept: 'BPR&HA', type: 'Vendor', vendor: 'Rabbit & Tortoise', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009288', pam: 'UAT PAM', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 14, name: 'Ayush Madnoorkar', id: 'T002177', dept: 'BPR&HA', type: 'Vendor', vendor: 'Rabbit & Tortoise', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007956', pam: 'NO', finnacle: 'NO', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 15, name: 'Shaikh Mohd Arish Mohd Danish', id: 'T002172', dept: 'BPR&HA', type: 'Vendor', vendor: 'Rabbit & Tortoise', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007475', pam: 'NO', finnacle: 'NO', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 17, name: 'Deepak Wankhede', id: 'T000993', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0005264', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 18, name: 'Sneha Jagtap', id: 'T001157', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0006104', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 19, name: 'Sahil Shende', id: 'T001983', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009283', pam: 'Yes', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 20, name: 'Aditya Rane', id: 'T000992', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0005397', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 21, name: 'Sakshi Dhavale', id: 'T001985', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009290', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 22, name: 'Vishaka More', id: 'T001987', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009281', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 23, name: 'Amrutha Padmakumar', id: 'T001986', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009285', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 24, name: 'Kanchan Mengune', id: 'T001988', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0009282', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 25, name: 'Ocean Shrivastava', id: 'T002279', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007992', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
  { sr: 26, name: 'Shridhar Iyer', id: 'T002281', dept: 'BPR&HA', type: 'Vendor', vendor: 'Idolize', laptopModel: 'Asus ExpertBook i5', assetId: 'USFBLT0007555', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: '' },
];

export default function AccessManagementPage() {
  const [data, setData] = useState(INITIAL_DATA);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  
  const [filters, setFilters] = useState({
    pam: '',
    finnacle: '',
    type: ''
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const createEmptyUser = () => ({
    name: '', id: '', dept: 'BPR&HA', type: 'Unity Staff', vendor: 'NA', newVendor: '', laptopModel: '', assetId: '', pam: 'No', finnacle: 'No', approvedBy: '', status: '', remarks: '', software: ''
  });
  const [newEntries, setNewEntries] = useState([createEmptyUser()]);

  const handleAddEntries = () => {
    const nextSr = data.length > 0 ? Math.max(...data.map(d => d.sr)) + 1 : 1;
    const entriesToAdd = newEntries.map((entry, idx) => ({
      ...entry,
      sr: nextSr + idx,
      vendor: entry.type === 'Unity Staff' ? 'NA' : (entry.vendor === 'NEW' ? entry.newVendor : entry.vendor)
    }));
    
    // Clean up temporary field
    entriesToAdd.forEach(e => delete (e as any).newVendor);
    
    setData([...data, ...entriesToAdd as typeof INITIAL_DATA]);
    setShowAddModal(false);
    setNewEntries([createEmptyUser()]);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive vendor tabs dynamically from data
  const vendorTabs = useMemo(() => {
    const vendors = new Set(data.map(d => d.vendor).filter(v => v !== 'NA' && v.trim() !== ''));
    return ['All', 'Unity Staff', ...Array.from(vendors)];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((user) => {
      // 1. Tab Filter
      if (activeTab === 'Unity Staff' && user.type !== 'Unity Staff') return false;
      if (activeTab !== 'All' && activeTab !== 'Unity Staff' && user.vendor !== activeTab) return false;

      // 2. Search Filter
      if (search && !(
        user.name.toLowerCase().includes(search.toLowerCase()) || 
        user.id.toLowerCase().includes(search.toLowerCase()) ||
        user.vendor.toLowerCase().includes(search.toLowerCase())
      )) return false;

      // 3. Dropdown Filters
      if (filters.pam && user.pam.toLowerCase() !== filters.pam.toLowerCase()) return false;
      if (filters.finnacle && user.finnacle.toLowerCase() !== filters.finnacle.toLowerCase()) return false;
      if (filters.type && user.type.toLowerCase() !== filters.type.toLowerCase()) return false;

      return true;
    });
  }, [data, activeTab, search, filters]);

  // Export to Excel
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(d => ({
      'SR. NO.': d.sr,
      'Employee Name': d.name,
      'Employee ID': d.id,
      'Department': d.dept,
      'User Type': d.type,
      'Vendor Company': d.vendor,
      'Laptop Model': d.laptopModel,
      'Laptop Asset ID': d.assetId,
      'PAM Access Provided': d.pam,
      'Finnacle Access Provided': d.finnacle,
      'Approved By': d.approvedBy,
      'Status': d.status,
      'Remarks': d.remarks,
      'Software License Issued': d.software,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Access Data");
    XLSX.writeFile(wb, "Access_Management_Export.xlsx");
  };

  // Import from Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json<any>(ws);

      // Map imported excel headers back to state object
      const newData = parsedData.map((d, i) => ({
        sr: d['SR. NO.'] || data.length + i + 1,
        name: d['Employee Name'] || '',
        id: d['Employee ID'] || '',
        dept: d['Department'] || '',
        type: d['User Type'] || '',
        vendor: d['Vendor Company'] || 'NA',
        laptopModel: d['Laptop Model'] || '',
        assetId: d['Laptop Asset ID'] || '',
        pam: d['PAM Access Provided'] || 'No',
        finnacle: d['Finnacle Access Provided'] || 'No',
        approvedBy: d['Approved By'] || '',
        status: d['Status'] || '',
        remarks: d['Remarks'] || '',
        software: d['Software License Issued'] || '',
      }));

      // In this demo, we append or replace. Let's replace for simplicity
      setData(newData);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
  };

  const getPamBadge = (pam: string) => {
    const p = pam.toLowerCase();
    if (p === 'yes') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (p === 'no') return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  };

  const getFinnacleBadge = (fin: string) => {
    const f = fin.toLowerCase();
    if (f === 'no') return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    if (f.includes('uat')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 max-w-[1600px] mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Access & User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track employee and vendor system access, laptop allocations, and rights.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" /> Import Data
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Users
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data.length, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'PAM Access', value: data.filter(d => d.pam.toLowerCase() === 'yes').length, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Unity Staff', value: data.filter(d => d.type === 'Unity Staff').length, icon: Building2, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { label: 'Laptops Issued', value: data.filter(d => d.laptopModel && d.laptopModel !== 'N/A').length, icon: Laptop, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", stat.bg, stat.border)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60">
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {vendorTabs.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={cn(
                "pb-3 text-sm font-medium transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, ID, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto relative">
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className={cn("flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-sm transition-colors shadow-sm", 
                showFilter || filters.pam || filters.finnacle ? "border-primary/50 text-primary bg-primary/5" : "border-border/50 hover:bg-muted"
              )}
            >
              <Filter className="w-4 h-4" /> Filters
              {(filters.pam || filters.finnacle) && <div className="w-2 h-2 rounded-full bg-primary ml-1" />}
            </button>
            
            {showFilter && (
              <div className="absolute top-12 right-0 w-64 bg-popover border border-border rounded-xl shadow-xl p-4 z-50 animate-fade-in">
                <h3 className="text-sm font-semibold mb-3">Filter Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">PAM Access</label>
                    <select 
                      value={filters.pam} 
                      onChange={e => setFilters({...filters, pam: e.target.value})}
                      className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="UAT PAM">UAT PAM</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Finnacle Access</label>
                    <select 
                      value={filters.finnacle} 
                      onChange={e => setFilters({...filters, finnacle: e.target.value})}
                      className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">All</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Only UAT Access">Only UAT Access</option>
                    </select>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={() => setFilters({ pam: '', finnacle: '', type: '' })}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-4 font-semibold w-16">Sr.</th>
                <th className="px-5 py-4 font-semibold">User Details</th>
                <th className="px-5 py-4 font-semibold">Department</th>
                <th className="px-5 py-4 font-semibold">Vendor Info</th>
                <th className="px-5 py-4 font-semibold">Hardware</th>
                <th className="px-5 py-4 font-semibold text-center">PAM</th>
                <th className="px-5 py-4 font-semibold text-center">Finnacle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.sr} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{row.sr}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shadow-inner">
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{row.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{row.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="inline-flex px-2 py-1 bg-secondary rounded-md text-xs font-medium">
                        {row.dept}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                       <div className="flex flex-col gap-1">
                          <span className={cn('inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase', 
                            row.type === 'Unity Staff' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'
                          )}>
                            {row.type}
                          </span>
                          {row.vendor !== 'NA' && (
                            <span className="text-xs text-muted-foreground">{row.vendor}</span>
                          )}
                       </div>
                    </td>
                    <td className="px-5 py-3">
                      {row.laptopModel && row.laptopModel !== 'N/A' && row.laptopModel !== '' ? (
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium text-xs">{row.laptopModel}</span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit mt-1 border border-border/50">
                            {row.assetId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('inline-flex px-2 py-1 rounded-md text-[11px] font-bold tracking-wider border', getPamBadge(row.pam))}>
                        {row.pam.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn('inline-flex px-2 py-1 rounded-md text-[11px] font-bold tracking-wider border', getFinnacleBadge(row.finnacle))}>
                        {row.finnacle.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
                      <p>No users found matching your filters.</p>
                      <button onClick={() => { setSearch(''); setActiveTab('All'); setFilters({pam:'', finnacle:'', type:''}) }} className="text-primary text-sm hover:underline mt-2">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/10">
          <span>Showing <strong className="text-foreground">{filteredData.length}</strong> of <strong className="text-foreground">{data.length}</strong> entries</span>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/50 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Add New Entries
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Add up to 5 new records at once. Select "NEW" in vendor to add a new vendor.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-muted/5">
              {newEntries.map((entry, idx) => (
                <div key={idx} className="bg-background rounded-xl p-5 border border-border/50 shadow-sm relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {newEntries.length > 1 && (
                      <button onClick={() => setNewEntries(newEntries.filter((_, i) => i !== idx))} className="text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-500/10 px-2 py-1 rounded-md">Remove</button>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mb-4 text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">{idx + 1}</span>
                    Entry Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Employee Name</label>
                      <input type="text" value={entry.name} onChange={e => { const a = [...newEntries]; a[idx].name = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="John Doe" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Employee ID</label>
                      <input type="text" value={entry.id} onChange={e => { const a = [...newEntries]; a[idx].id = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 1014147" />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">User Type</label>
                      <select value={entry.type} onChange={e => { const a = [...newEntries]; a[idx].type = e.target.value; if (e.target.value === 'Unity Staff') a[idx].vendor = 'NA'; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none">
                        <option value="Unity Staff">Unity Staff</option>
                        <option value="Vendor">Vendor</option>
                      </select>
                    </div>
                    
                    {entry.type === 'Vendor' ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Vendor Company</label>
                          <select value={entry.vendor} onChange={e => { const a = [...newEntries]; a[idx].vendor = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none">
                            <option value="NA">Select Vendor...</option>
                            {Array.from(new Set(data.map(d=>d.vendor).filter(v=>v!=='NA'&&v!==''))).map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                            <option value="NEW">+ Add New Vendor</option>
                          </select>
                        </div>
                        {entry.vendor === 'NEW' && (
                          <div className="md:col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block text-blue-500">New Vendor Name</label>
                            <input type="text" value={entry.newVendor} onChange={e => { const a = [...newEntries]; a[idx].newVendor = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-blue-500/5 border border-blue-500/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. IBM, Cognizant" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="md:col-span-2" /> // spacer
                    )}
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                      <input type="text" value={entry.dept} onChange={e => { const a = [...newEntries]; a[idx].dept = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Laptop Model</label>
                      <input type="text" value={entry.laptopModel} onChange={e => { const a = [...newEntries]; a[idx].laptopModel = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Asus ExpertBook" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Asset ID</label>
                      <input type="text" value={entry.assetId} onChange={e => { const a = [...newEntries]; a[idx].assetId = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. USFBLT000123" />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">PAM Access</label>
                      <select value={entry.pam} onChange={e => { const a = [...newEntries]; a[idx].pam = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="UAT PAM">UAT PAM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Finnacle Access</label>
                      <select value={entry.finnacle} onChange={e => { const a = [...newEntries]; a[idx].finnacle = e.target.value; setNewEntries(a); }} className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Only UAT Access">Only UAT Access</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              {newEntries.length < 5 && (
                <button onClick={() => setNewEntries([...newEntries, createEmptyUser()])} className="w-full py-4 border-2 border-dashed border-primary/30 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Add Another Entry (Max 5)
                </button>
              )}
            </div>
            
            <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-muted/20 rounded-b-2xl">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border/50 hover:bg-muted transition-colors bg-background">Cancel</button>
              <button onClick={handleAddEntries} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Save {newEntries.length} {newEntries.length === 1 ? 'Entry' : 'Entries'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple page state hook for tabs (mocked)
function setPage(arg0: number) {
  // no-op for now unless pagination is added
}
