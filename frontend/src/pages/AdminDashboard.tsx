import { useState, useEffect } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle, Clock, MapPin, Activity, Shield, Hash, Search, BarChart3, Map as MapIcon, TrendingUp, AlertOctagon, FileText, Trash2, Calendar, X, Edit, UserCheck, Camera, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequestsList } from '@/components/admin/LeaveRequestsList';
import DisciplineModule from '@/components/admin/DisciplineModule';
import HeatmapModule from '@/components/admin/HeatmapModule';
import FloodRiskModule from '@/components/admin/FloodRiskModule';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'dashboard').toLowerCase();
  
  const [complaints, setComplaints] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [filteredEngineers, setFilteredEngineers] = useState<any[]>([]);
  const [providedTime, setProvidedTime] = useState<number>(24);

  // Detail Modals
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [viewingComplaint, setViewingComplaint] = useState<any>(null);
  const [engineerModalOpen, setEngineerModalOpen] = useState(false);
  const [viewingEngineer, setViewingEngineer] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Notice Modal
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

  // Sorting & Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'created_at' | 'predicted_days' | 'severity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    console.log("AdminDashboard activeTab:", activeTab);
    console.log("AdminDashboard notices:", notices);
  }, [activeTab, notices]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, engRes, noticeRes] = await Promise.all([
        fetch(getApiUrl('/complaints')),
        fetch(getApiUrl('/engineers')),
        fetch(getApiUrl('/complaints/notices/all'))
      ]);
      const parseRes = async (r: Response) => { const t = await r.text(); try { return t ? JSON.parse(t) : []; } catch { return []; } };
      const compData = await parseRes(compRes);
      const engData = await parseRes(engRes);
      const noticeData = await parseRes(noticeRes);
      setComplaints(compData);
      setEngineers(engData);
      setNotices(noticeData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to synchronize with Command Centre");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDecision = async (action: 'accept' | 'reject') => {
    if (!reviewNotes.trim()) return toast.error("Please provide review notes/feedback.");
    
    setSubmittingReview(true);
    try {
      const res = await fetch(getApiUrl(`/complaints/notices/${selectedNotice._id}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          notes: reviewNotes,
          suspension_days: suspensionDays
        })
      });
      if (!res.ok) throw new Error("Decision submission failed");
      toast.success(action === 'accept' ? "Explanation Accepted. Case re-assigned." : "Explanation Rejected. Suspension Order Issued.");
      setReviewModalOpen(false);
      setReviewNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenAssign = (complaint: any) => {
    setSelectedComplaint(complaint);
    const exclusions = complaint.excluded_engineers || [];
    const suitable = engineers.filter(eng => 
      (eng.role === 'resolver') &&
      !exclusions.includes(eng._id) &&
      (eng.dept_name === complaint.issue_type?.replace('_', ' ') || 
       eng.area_expertise?.toLowerCase().includes(complaint.issue_type?.toLowerCase() || ''))
    );
    setFilteredEngineers(suitable.length > 0 ? suitable : engineers.filter(e => !exclusions.includes(e._id)));
    setAssignModalOpen(true);
  };

  const handleAssign = async (engineerId: string) => {
    try {
      const response = await fetch(getApiUrl('/complaints/assign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            complaint_id: selectedComplaint.id || selectedComplaint._id,
            engineer_id: engineerId, 
            provided_time: providedTime 
        })
      });

      if (!response.ok) throw new Error("Dispatch protocol failed");
      
      toast.success("Engineer dispatched successfully");
      setAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEngineer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove engineer ${name}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(getApiUrl(`/engineers/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to remove engineer");
      toast.success("Engineer record deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReturnToWork = async (id: string, name: string) => {
    try {
      const res = await fetch(getApiUrl(`/engineers/${id}/return-to-work`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success(`✅ ${name} has been returned to active duty.`);
      setEngineerModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCloseComplaint = async (complaintId: string) => {
    if (!window.confirm("Are you sure you want to close this complaint? This will free the assigned engineer.")) return;
    try {
      const res = await fetch(getApiUrl(`/complaints/${complaintId}/close`), { method: 'POST' });
      if (!res.ok) throw new Error("Close protocol failed");
      toast.success("Complaint closed and engineer released");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendNotice = async () => {
    if (!noticeMessage.trim()) return;
    try {
      const res = await fetch(getApiUrl('/complaints/notice'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            engineer_id: selectedComplaint.engineer_id || selectedComplaint.assigned_engineer, // Backend expects engineer_id
            admin_id: user?._id || user?.id,
            complaint_id: selectedComplaint.id || selectedComplaint._id,
            message: noticeMessage 
        })
      });
      if (!res.ok) throw new Error("Failed to issue notice");
      toast.success("Disciplinary notice issued");
      setNoticeModalOpen(false);
      setNoticeMessage("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500 text-white';
      case 'In Progress': return 'bg-orange-500 text-white';
      case 'Show Cause Issued': return 'bg-red-600 text-white font-black animate-pulse shadow-glow-destructive';
      case 'Compliance Review': return 'bg-purple-600 text-white font-black shadow-glow';
      case 'Resolved': return 'bg-emerald-500 text-white';
      case 'Closed': return 'bg-gray-500 text-white';
      default: return 'bg-primary text-white';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return <Badge className="bg-red-500 text-white border-none animate-pulse">CRITICAL</Badge>;
      case 'medium': return <Badge className="bg-orange-500 text-white border-none">MODERATE</Badge>;
      default: return <Badge className="bg-blue-500 text-white border-none">LOW</Badge>;
    }
  };

  const getEngineerStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500 text-white border-none';
      case 'Busy': return 'bg-orange-500 text-white border-none';
      case 'On Leave': return 'bg-rose-500 text-white border-none';
      default: return 'bg-gray-500 text-white border-none';
    }
  };

  const sortedComplaints = [...complaints]
    .filter(c => 
      c.issue_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (sortOrder === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full max-w-[1400px] mx-auto">
        <DashboardSidebar />

        <main className="flex-1 w-full overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 hide-scrollbar">
            
            {/* 1. COMMAND CENTRE (COMPLAINT MANAGEMENT) */}
            {activeTab === 'command-center' && (
              <div key="command" className="space-y-6">
                <div className="mb-4">
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Shield className="h-8 w-8 text-primary" /> Command Centre
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">Strategic dispatch and infrastructure monitoring hub.</p>
                </div>

                <div className="flex gap-4 mb-6 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search regional issues..." 
                      className="pl-10 h-12 bg-secondary/30 border-border/50 rounded-xl" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={sortBy} 
                      onChange={(e: any) => setSortBy(e.target.value as any)}
                      className="bg-secondary/30 border border-border/50 rounded-xl px-3 text-sm h-12 focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                    >
                      <option value="created_at">Date Reported</option>
                      <option value="predicted_days">AI Priority</option>
                      <option value="severity">Severity Scale</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 border-border/50 rounded-xl"
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      <TrendingUp className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-12"><Activity className="animate-spin text-primary h-12 w-12" /></div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12">
                    {/* SECTION 1: NEWLY REGISTERED & DISPATCH READY */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-blue-500">
                          <AlertOctagon className="h-5 w-5" /> Dispatch Needed
                        </h2>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">{sortedComplaints.filter(c => c.status === 'New').length}</Badge>
                      </div>
                      
                      <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                        {sortedComplaints.filter(c => c.status === 'New').length === 0 ? (
                          <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground italic">No new issues to dispatch</div>
                        ) : (
                          sortedComplaints.filter(c => c.status === 'New').map(c => (
                            <Card key={c.id || c._id} className="glass-panel hover:border-blue-500/50 transition-all p-5 relative group border-l-4 border-l-blue-500">
                               <div className="flex justify-between items-start mb-4">
                                  {getSeverityBadge(c.severity)}
                                  <span className="text-[10px] font-black tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded-full uppercase">{c.reference_number}</span>
                               </div>
                               <h3 className="font-bold text-lg text-foreground capitalize mb-1">{c.issue_type?.replace('_', ' ')}</h3>
                               <p className="text-xs text-muted-foreground font-medium mb-4 flex items-start gap-1">
                                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {c.address || 'Location Hidden'}
                                </p>
                               <div className="flex flex-col gap-3">
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-orange-500">
                                     <Clock className="h-3.5 w-3.5" /> AI ETA: {c.predicted_days} Days
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                     <Button variant="outline" size="sm" onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} className="font-bold border-border shadow-sm">Details</Button>
                                     <Button size="sm" onClick={() => handleOpenAssign(c)} className="gradient-primary text-white font-bold shadow-lg shadow-blue-500/20">Dispatch</Button>
                                  </div>
                               </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: ACTIVE & IN PROGRESS */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-purple-500">
                          <Activity className="h-5 w-5" /> Field Operations
                        </h2>
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">{sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).length}</Badge>
                      </div>

                      <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                        {sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).length === 0 ? (
                          <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground italic">No ongoing field operations</div>
                        ) : (
                          sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).map(c => (
                            <Card key={c.id || c._id} className="glass-panel hover:border-purple-500/50 transition-all p-5 relative border-l-4 border-l-purple-500">
                               <div className="flex justify-between items-center mb-4">
                                  <Badge className="bg-purple-500/10 text-purple-500 border-transparent text-[10px] font-black tracking-widest">{c.status?.toUpperCase()}</Badge>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase">{c.reference_number}</span>
                               </div>
                               <h3 className="font-bold text-lg text-foreground capitalize mb-1">{c.issue_type?.replace('_', ' ')}</h3>
                               <p className="text-xs text-muted-foreground mb-4">Engineer: <span className="font-bold text-foreground">{c.assigned_engineer_name || 'N/A'}</span></p>
                               
                               <div className="flex flex-col gap-2">
                                  <div className="grid grid-cols-2 gap-2">
                                     <Button 
                                       variant="destructive" 
                                       size="sm"
                                       onClick={() => { 
                                         setSelectedComplaint(c); 
                                         setNoticeMessage(`URGENT: SHOW CAUSE NOTICE (KARAN BATAO)\n\nReference: ${c.reference_number}\nIssue Type: ${c.issue_type}\n\nAdministrative review has detected potential irregularities or delays in your current assignment.\n\nYou are required to submit an immediate justification with site-visit proof (evidence image). Failure to comply will result in disciplinary action.`);
                                         setNoticeModalOpen(true); 
                                       }} 
                                       className="font-black text-[10px] uppercase h-10 border-2 border-destructive shadow-glow-destructive"
                                     >
                                       Show Cause
                                     </Button>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleCloseComplaint(c.id || c._id)}
                                       className="font-black text-[10px] uppercase h-10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                                     >
                                       Satisfied/Close
                                     </Button>
                                  </div>
                                  <Button variant="secondary" size="sm" onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} className="w-full font-bold h-9">Inspection Profile</Button>
                               </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>

                    {/* SECTION 3: RESOLVED & ARCHIVED */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 text-emerald-500">
                          <CheckCircle className="h-5 w-5" /> Completed Log
                        </h2>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length}</Badge>
                      </div>

                      <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
                        {sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length === 0 ? (
                          <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground italic">No historical data available</div>
                        ) : (
                          sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).map(c => (
                            <Card key={c.id || c._id} className="glass-panel p-5 border-l-4 border-l-emerald-500 bg-emerald-500/5">
                               <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                     <CheckCircle className="h-4 w-4 text-emerald-500" />
                                     <span className="text-[10px] font-black text-emerald-600 uppercase">Successful Outcome</span>
                                  </div>
                                  <span className="text-[10px] font-black text-muted-foreground uppercase">{c.reference_number}</span>
                               </div>
                               <h3 className="font-bold text-lg text-foreground/80 capitalize mb-1">{c.issue_type?.replace('_', ' ')}</h3>
                               <p className="text-xs text-muted-foreground mb-4 font-medium">Closed on: {new Date(c.updated_at || c.created_at).toLocaleDateString()}</p>
                               <Button variant="outline" size="sm" onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} className="w-full font-bold border-emerald-500/20 hover:bg-emerald-500/10">View Archive</Button>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. ADMIN DASHBOARD (STATS & ANALYTICS) */}
            {activeTab === 'dashboard' && (
              <div key="stats" className="space-y-8">
                <div className="mb-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-blue-500" /> Executive Analytics
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">Real-time system performance and regional infrastructure metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Complaints', value: complaints.length, icon: FileText, color: 'text-blue-500' },
                    { label: 'Resolved Cases', value: complaints.filter(c => c.status === 'Closed' || c.status === 'Resolved').length, icon: CheckCircle, color: 'text-emerald-500' },
                    { label: 'Pending Actions', value: complaints.filter(c => c.status === 'New').length, icon: AlertOctagon, color: 'text-red-500' },
                    { label: 'Avg. Response', value: '1.2 Days', icon: Clock, color: 'text-purple-500' }
                  ].map((stat, i) => (
                    <Card key={i} className="glass-panel border-border/40 shadow-sm hover:border-primary/30 transition-all">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div className="text-3xl font-black text-foreground">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="relative max-w-2xl mx-auto w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search across all categories..." 
                    className="pl-10 h-12 bg-secondary/30 border-border/50 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="glass-panel border-border/40 min-h-[400px]">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold uppercase tracking-wider">Issue Type Distribution</CardTitle>
                      <CardDescription>Breakdown of reported problems by category</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Garbage', value: complaints.filter(c => c.issue_type === 'garbage').length },
                          { name: 'Pothole', value: complaints.filter(c => c.issue_type === 'pothole').length },
                          { name: 'Water', value: complaints.filter(c => c.issue_type === 'waterlogging').length },
                          { name: 'Light', value: complaints.filter(c => c.issue_type === 'broken_streetlight').length },
                          { name: 'Other', value: complaints.filter(c => !['garbage', 'pothole', 'waterlogging', 'broken_streetlight'].includes(c.issue_type)).length },
                        ]}>
                          <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-panel border-border/40 min-h-[400px]">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold uppercase tracking-wider">Case Status Lifecycle</CardTitle>
                      <CardDescription>Operational flow of all registered complaints</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'New', value: complaints.filter(c => c.status === 'New').length },
                              { name: 'Assigned', value: complaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).length },
                              { name: 'Closed', value: complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length },
                            ]}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#f97316" />
                            <Cell fill="#10b981" />
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* THE THREE SECTIONS AT BOTTOM */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* 1. NEWLY REGISTERED */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-blue-500 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 shadow-sm">
                      <AlertOctagon className="h-5 w-5" /> Newly Registered
                      <Badge className="ml-auto bg-blue-500 text-white font-black">{sortedComplaints.filter(c => c.status === 'New').length}</Badge>
                    </h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {sortedComplaints.filter(c => c.status === 'New').length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/50">No new complaints</div>
                      ) : (
                        sortedComplaints.filter(c => c.status === 'New').map(c => (
                          <div key={c._id || c.id} onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} className="p-4 rounded-xl border border-border/40 bg-card hover:border-blue-500/50 cursor-pointer transition-all shadow-sm group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500" />
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="font-bold text-sm capitalize">{c.issue_type?.replace('_', ' ')}</h4>
                               <Badge variant="outline" className="text-[10px] py-0">{c.reference_number}</Badge>
                             </div>
                             <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 font-medium">{c.address || 'Location Hidden'}</p>
                             <div className="flex justify-between items-center text-[10px]">
                               <span className="font-bold text-primary">{new Date(c.created_at).toLocaleDateString()}</span>
                               <Button size="sm" className="h-7 text-[10px] px-2 bg-blue-500 hover:bg-blue-600">Action Required</Button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. ASSIGNED COMPLAINTS */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-orange-500 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 shadow-sm">
                      <Clock className="h-5 w-5" /> Active Assignments
                      <Badge className="ml-auto bg-orange-500 text-white font-black">{sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).length}</Badge>
                    </h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                       {sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/50">No active assignments</div>
                      ) : (
                        sortedComplaints.filter(c => ['Forwarded', 'Assigned', 'In Progress'].includes(c.status)).map(c => (
                          <div key={c._id || c.id} onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} className="p-4 rounded-xl border border-border/40 bg-card hover:border-orange-500/50 cursor-pointer transition-all shadow-sm group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-1.5 h-full bg-orange-500" />
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="font-bold text-sm capitalize">{c.issue_type?.replace('_', ' ')}</h4>
                               <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">{c.status}</span>
                             </div>
                             <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 font-bold italic">By: {c.assigned_engineer_name || 'N/A'}</p>
                             <div className="flex justify-between items-center text-[10px]">
                               <span className="font-bold text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                               <span className="font-black text-rose-500">{c.predicted_days} Days ETA</span>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. CLOSED COMPLAINTS */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                      <CheckCircle className="h-5 w-5" /> Completed Tasks
                      <Badge className="ml-auto bg-emerald-500 text-white font-black">{sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length}</Badge>
                    </h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                       {sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/50">No completed tasks</div>
                      ) : (
                        sortedComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).map(c => {
                          const isDissatisfied = c.satisfaction_status === 'Dissatisfied';
                          return (
                            <div 
                              key={c._id || c.id} 
                              onClick={() => { setViewingComplaint(c); setComplaintModalOpen(true); }} 
                              className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm group relative overflow-hidden ${
                                isDissatisfied 
                                  ? 'border-2 border-destructive bg-destructive/10 animate-pulse shadow-glow-destructive hover:bg-destructive/15' 
                                  : 'border-border/40 bg-card hover:border-emerald-500/50'
                              }`}
                            >
                               <div className={`absolute top-0 right-0 w-2 h-full ${isDissatisfied ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                               <div className="flex justify-between items-start mb-2">
                                 <h4 className="font-bold text-sm capitalize flex items-center gap-1.5">
                                   {c.issue_type?.replace('_', ' ')}
                                   {isDissatisfied && (
                                     <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-ping shrink-0" />
                                   )}
                                 </h4>
                                 {isDissatisfied ? (
                                   <AlertOctagon className="h-4 w-4 text-destructive animate-bounce shrink-0" />
                                 ) : (
                                   <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                 )}
                               </div>
                               <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 font-bold italic">
                                 Engineer: {c.assigned_engineer_name || 'N/A'} • Citizen: {c.citizen_name || 'Anonymous'}
                               </p>

                               {isDissatisfied && (
                                 <div className="p-2 mb-2 rounded-lg bg-destructive/20 border border-destructive/30 text-[10px] text-destructive font-black leading-tight flex items-center gap-1.5">
                                   <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-bounce" />
                                   <span className="truncate">UNSATISFACTORY: "{c.citizen_feedback || 'Citizen rejected resolution'}"</span>
                                 </div>
                               )}

                               <div className="flex justify-between items-center text-[10px]">
                                 <span className="font-bold text-muted-foreground">Ended: {new Date(c.updated_at || c.created_at).toLocaleDateString()}</span>
                                 {isDissatisfied ? (
                                   <Badge className="bg-destructive text-white hover:bg-destructive text-[9px] font-black border-none animate-bounce shadow-glow-destructive">
                                     ACTION REQUIRED
                                   </Badge>
                                 ) : (
                                   <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] font-black border-none">
                                     ARCHIVED
                                   </Badge>
                                 )}
                               </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. LIVE CITY HEATMAP & FLOOD INTELLIGENCE */}
            {activeTab === 'heatmap' && <HeatmapModule />}

            {/* 4. COMPLIANCE & DISCIPLINE (New Module) */}
            {activeTab === 'discipline' && <DisciplineModule />}

            {/* 4. ENGINEER DETAILS */}
            {activeTab === 'engineers' && (
              <div key="engineers" className="space-y-6">
                <div className="mb-8">
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Users className="h-8 w-8 text-purple-500" /> Engineer Details
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">Manage field personnel, track workloads, and monitor unit availability.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {engineers.map(eng => (
                    <Card key={eng.id || eng._id} className="glass-panel hover:border-purple-500/50 transition-colors p-6 overflow-hidden relative">
                       <div className={`absolute top-0 right-0 w-2 h-full ${getEngineerStatusColor(eng.activity_status)}`} />
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex-1">
                           <h4 className="text-xl font-bold text-foreground">{eng.name}</h4>
                           <p className="text-sm text-muted-foreground">{eng.dept_name || 'General Resolver'}</p>
                           <p className="text-[10px] font-black text-primary/70 uppercase mt-0.5">Joined: {new Date(eng.created_at).toLocaleDateString()}</p>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                           <Badge className={getEngineerStatusColor(eng.activity_status)}>{eng.activity_status}</Badge>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             onClick={(e) => { e.stopPropagation(); handleDeleteEngineer(eng.id || eng._id, eng.name); }}
                             className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex justify-between text-sm">
                             <span className="text-muted-foreground font-medium">Experience</span>
                             <span className="text-foreground font-bold">{eng.experience_level || 'Senior'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                             <span className="text-muted-foreground font-medium">Active Tasks</span>
                             <span className="text-primary font-bold">{eng.active_tasks}</span>
                          </div>
                          <div className="pt-4 border-t border-border/30">
                             <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Expertise</h4>
                             <div className="flex flex-wrap gap-2">
                                {eng.area_expertise?.split(',').map((ex: string) => (
                                  <Badge key={ex} variant="secondary" className="bg-secondary/50">{ex.trim()}</Badge>
                                )) || <Badge variant="secondary">Civic Management</Badge>}
                             </div>
                          </div>
                       </div>
                        <Button onClick={() => { setViewingEngineer(eng); setEngineerModalOpen(true); }} className="w-full mt-6 bg-secondary text-foreground hover:bg-secondary/80 font-bold">View Full Profile</Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 4. FLOOD RISK PREDICTOR */}
            {activeTab === 'flood-risk' && (
              <FloodRiskModule apiUrl={getApiUrl('')} />
            )}

            {/* 5. LEAVE REQUESTS MANAGEMENT */}
            {activeTab === 'leave-requests' && (
              <div key="leave-requests" className="space-y-6">
                <div className="mb-8">
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Calendar className="h-8 w-8 text-rose-500" /> Leave Management
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm">Review, approve, or reject field personnel leave applications.</p>
                </div>

                <div className="space-y-6">
                   <LeaveRequestsList onStatusChange={fetchData} />
                </div>
              </div>
            )}

        </main>
      </div>

      {/* SMART ASSIGNMENT DIALOG */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-strong border-primary/20 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Smart Engineer Assignment
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              AI suggests engineers based on department match and workload capacity.
            </p>
          </DialogHeader>
          <div className="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <h4 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-2">Set Resolution Deadline</h4>
            <div className="flex items-center gap-4">
               <div className="flex-1">
                  <Input 
                    type="number" 
                    value={providedTime} 
                    onChange={(e) => setProvidedTime(parseInt(e.target.value) || 1)}
                    className="h-10 bg-background border-border"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                    Total hours allocated for resolution (Includes 1 Day CDB Buffer)
                  </p>
               </div>
               <div className="px-4 py-2 bg-secondary rounded-lg text-xs font-bold whitespace-nowrap">
                  ≈ {(providedTime / 24).toFixed(1)} Days
               </div>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 mt-4 custom-scrollbar">
            {!Array.isArray(filteredEngineers) || filteredEngineers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No suitable engineers found.</p>
            ) : (
              filteredEngineers.map(eng => {
                const isOptimal = eng.active_tasks < 2 && eng.activity_status === 'Available';
                return (
                  <div key={eng.id || eng._id} className={`p-4 rounded-xl border ${isOptimal ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-secondary/20'} flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">{eng.name}</h4>
                        {isOptimal && <Badge className="bg-emerald-500 text-white text-[10px] py-0">Recommended</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{eng.dept_name} • {eng.active_tasks} tasks</p>
                      <p className={`text-[10px] font-bold mt-1 uppercase ${eng.activity_status === 'Available' ? 'text-emerald-500' : 'text-orange-500'}`}>{eng.activity_status}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={eng.activity_status !== 'Available'}
                      onClick={() => handleAssign(eng.id || eng._id)}
                      className={isOptimal ? 'gradient-primary hover:scale-105 shadow-glow' : 'bg-secondary text-foreground hover:bg-secondary/80'}
                    >
                      Dispatch
                    </Button>
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter className="mt-2 pt-4 border-t border-border/20">
            <Button variant="ghost" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPLAINT DETAIL DIALOG */}
      <Dialog open={complaintModalOpen} onOpenChange={setComplaintModalOpen}>
        <DialogContent className="sm:max-w-[850px] glass-strong border-primary/20 shadow-elevated max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
                <FileText className="h-6 w-6 text-primary" /> Complaint Details
              </DialogTitle>
              {viewingComplaint && (
                <div className="flex items-center gap-2 pr-6">
                  <Badge className={getStatusColor(viewingComplaint.status)}>{viewingComplaint.status}</Badge>
                  {getSeverityBadge(viewingComplaint.severity)}
                </div>
              )}
            </div>
          </DialogHeader>

          {viewingComplaint && (
            <div className="space-y-6 py-4">
              
              {/* SIDE-BY-SIDE VISUAL PROOF: CITIZEN (BEFORE) vs ENGINEER (AFTER) */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> Visual Inspection & Work Proof
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* CITIZEN REPORTED IMAGE (BEFORE) */}
                  <div className="rounded-2xl border border-border/50 bg-secondary/15 p-3 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-blue-500 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5" /> Citizen Photo (Before)
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {new Date(viewingComplaint.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border/40 bg-black/40 aspect-video relative group flex items-center justify-center">
                      {viewingComplaint.before_image ? (
                        <img 
                          src={viewingComplaint.before_image} 
                          alt="Citizen Issue" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                          onClick={() => window.open(viewingComplaint.before_image, '_blank')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-4">
                          <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mb-1" />
                          <p className="text-xs font-bold">No Citizen Image Provided</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">
                      Uploaded by: <span className="font-bold text-foreground">{viewingComplaint.citizen_name || 'Anonymous'}</span>
                    </p>
                  </div>

                  {/* ENGINEER RESOLUTION IMAGE (AFTER PROOF) */}
                  <div className={`rounded-2xl border p-3 flex flex-col justify-between space-y-3 ${
                    viewingComplaint.after_image 
                      ? 'border-emerald-500/40 bg-emerald-500/5' 
                      : 'border-border/50 bg-secondary/15'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-emerald-500 flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" /> Engineer Work Proof (After)
                      </span>
                      {viewingComplaint.after_image ? (
                        <Badge className="bg-emerald-500 text-white text-[9px] font-black">COMPLETED</Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-500 border-orange-500/40 text-[9px] font-bold animate-pulse">PENDING PROOF</Badge>
                      )}
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border/40 bg-black/40 aspect-video relative group flex items-center justify-center">
                      {viewingComplaint.after_image ? (
                        <img 
                          src={viewingComplaint.after_image} 
                          alt="Resolution Proof" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                          onClick={() => window.open(viewingComplaint.after_image, '_blank')}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                          <Clock className="h-8 w-8 text-orange-500/70 mb-1 animate-pulse" />
                          <p className="text-xs font-bold text-foreground">Pending Resolution Proof</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Engineer has not uploaded work photo yet.</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">
                      Assigned Unit: <span className="font-bold text-foreground">{viewingComplaint.assigned_engineer_name || 'Unassigned'}</span>
                    </p>
                  </div>

                </div>
              </div>

              {/* COMPLAINT DETAILS METADATA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/40">
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Issue Type</h4>
                  <p className="text-sm font-bold text-foreground capitalize mt-0.5">{viewingComplaint.issue_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Reference Number</h4>
                  <p className="text-sm font-mono font-black text-primary mt-0.5">{viewingComplaint.reference_number}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Reported By</h4>
                  <p className="text-sm font-bold text-foreground mt-0.5">{viewingComplaint.citizen_name || 'Anonymous'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Reported At</h4>
                  <p className="text-xs font-bold text-foreground mt-0.5">{new Date(viewingComplaint.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* LOCATION & DESCRIPTION */}
              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Location Address</h4>
                  <p className="text-sm text-foreground flex items-start gap-2 bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{viewingComplaint.address || 'Manual Location Set'}</span>
                  </p>
                  {(viewingComplaint.latitude && viewingComplaint.longitude) && (
                    <p className="text-[10px] text-muted-foreground font-bold mt-1 ml-2">
                      GPS Coordinates: {viewingComplaint.latitude.toFixed(6)}, {viewingComplaint.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Citizen Description</h4>
                  <p className="text-sm text-foreground leading-relaxed bg-secondary/20 p-4 rounded-xl border border-border/30">
                    {viewingComplaint.description || "No additional description provided."}
                  </p>
                </div>
              </div>

              {/* CITIZEN SATISFACTION FEEDBACK */}
              {viewingComplaint.satisfaction_status && viewingComplaint.satisfaction_status !== "Pending" && (
                <div className="pt-4 border-t border-border/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Citizen Feedback & Rating
                    </h4>
                    <Badge className={`${viewingComplaint.satisfaction_status === 'Satisfied' ? 'bg-emerald-500' : 'bg-destructive'} text-white font-black`}>
                      {viewingComplaint.satisfaction_status?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className={`p-5 rounded-2xl border ${viewingComplaint.satisfaction_status === 'Satisfied' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'} relative overflow-hidden`}>
                     <div className={`absolute top-0 left-0 w-1.5 h-full ${viewingComplaint.satisfaction_status === 'Satisfied' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                     <p className="text-sm font-bold text-foreground leading-relaxed italic">
                        "{viewingComplaint.citizen_feedback || 'No verbal feedback provided by citizen.'}"
                     </p>
                  </div>
                  
                  {viewingComplaint.satisfaction_status === "Dissatisfied" && (
                    <Button 
                       onClick={() => {
                          setComplaintModalOpen(false);
                          setSelectedComplaint(viewingComplaint);
                          setNoticeMessage(`URGENT: DISCIPLINARY PROCEEDING\n\nReference: ${viewingComplaint.reference_number}\nIssue Type: ${viewingComplaint.issue_type}\n\nCitizen reported IRREGULAR or ILLEGAL ACTIVITY regarding your resolution.\n\nReason: "${viewingComplaint.citizen_feedback}"\n\nYou are required to submit a justification with proof of site visit immediately.`);
                          setNoticeModalOpen(true);
                       }}
                       className="w-full h-12 bg-destructive text-white hover:bg-destructive/90 font-black shadow-glow-destructive"
                    >
                       <AlertOctagon className="mr-2 h-5 w-5" /> Raise Official Disciplinary Action
                    </Button>
                  )}
                </div>
              )}

              {viewingComplaint.status === 'New' && (
                <div className="pt-4 border-t border-border/30">
                   <Button onClick={() => { setComplaintModalOpen(false); handleOpenAssign(viewingComplaint); }} className="w-full h-12 gradient-primary text-primary-foreground font-bold shadow-glow">
                      Proceed to Engineer Assignment
                   </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ENGINEER DETAIL DIALOG */}
      <Dialog open={engineerModalOpen} onOpenChange={setEngineerModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-strong border-purple-500/20 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
              <Users className="h-6 w-6 text-purple-500" /> Engineer Profile
            </DialogTitle>
          </DialogHeader>

          {viewingEngineer && (
            <div className="space-y-6 py-4">
               <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                     <Users className="h-8 w-8 text-purple-500" />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-foreground">{viewingEngineer.name}</h3>
                     <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">{viewingEngineer.dept_name || 'N/A'}</p>
                     <Badge className={`mt-2 ${getEngineerStatusColor(viewingEngineer.activity_status)}`}>
                        {viewingEngineer.activity_status}
                     </Badge>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Email Address</h4>
                    <p className="text-sm font-bold text-foreground truncate">{viewingEngineer.email}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Phone Number</h4>
                    <p className="text-sm font-bold text-foreground">{viewingEngineer.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Experience</h4>
                    <p className="text-sm font-bold text-foreground">{viewingEngineer.experience_level || 'Senior'}</p>
                  </div>
                   <div>
                     <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Government ID</h4>
                     <p className="text-sm font-mono font-bold text-primary">{viewingEngineer.gov_id || 'VERIFIED'}</p>
                   </div>
                   <div>
                     <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Registered On</h4>
                     <p className="text-sm font-bold text-foreground">{new Date(viewingEngineer.created_at).toLocaleDateString()} {new Date(viewingEngineer.created_at).toLocaleTimeString()}</p>
                   </div>
                </div>

               <div className="space-y-3 pt-4 border-t border-border/30">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Expertise & Skills</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {viewingEngineer.area_expertise?.split(',').map((ex: string) => (
                          <Badge key={ex} variant="secondary" className="bg-secondary/50 font-bold">{ex.trim()}</Badge>
                        )) || <Badge variant="secondary">Civic Management</Badge>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Service Area</h4>
                    <p className="text-sm text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-500" />
                      {viewingEngineer.city ? `${viewingEngineer.area || ''}, ${viewingEngineer.city}, ${viewingEngineer.state || ''}` : 'Regional Head Office'}
                    </p>
                  </div>
                  <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/10">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Workload Status</span>
                        <span className="text-sm font-black text-purple-500">{viewingEngineer.active_tasks} Active Tasks</span>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-2 pt-2">
                 {/* Return to Work button — only shown when engineer is On Leave */}
                 {viewingEngineer.activity_status === 'On Leave' && (
                   <Button
                     onClick={() => handleReturnToWork(viewingEngineer.id || viewingEngineer._id, viewingEngineer.name)}
                     className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-lg"
                   >
                     <UserCheck className="h-4 w-4 mr-2" /> Return to Work / Remove Leave
                   </Button>
                 )}
                 <div className="flex gap-3">
                   <Button onClick={() => setEngineerModalOpen(false)} className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 font-bold">
                      Close Profile
                   </Button>
                   <Button 
                     onClick={() => handleDeleteEngineer(viewingEngineer.id || viewingEngineer._id, viewingEngineer.name)} 
                     variant="destructive"
                     className="flex-1 font-bold shadow-glow-destructive"
                   >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove Engineer
                   </Button>
                 </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REVIEW DECISION DIALOG */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-strong border-primary/20 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase text-primary">
              <Shield className="h-6 w-6" /> Final Ruling: Compliance Review
            </DialogTitle>
            <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-tighter">
              Issuing official decision on engineer justification
            </p>
          </DialogHeader>

          <div className="my-4 space-y-6">
             <div className="p-4 bg-secondary/30 rounded-2xl border border-border/30">
                <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest border-b border-border/10 pb-1">Engineer Statement:</h4>
                <p className="text-sm font-medium italic">"{selectedNotice?.reason}"</p>
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Internal Review Notes</label>
                <textarea 
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide detailed reasoning for your decision (recorded in official history)..."
                  className="w-full h-32 bg-secondary/30 border border-border/50 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
             </div>

             <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/20">
                <p className="text-[10px] font-black text-orange-600 uppercase mb-2 tracking-widest">Decision Impact Analysis</p>
                <div className="space-y-2">
                   <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle className="h-4 w-4" /></div>
                      <p className="text-[10px] font-bold text-muted-foreground">ACCEPT: Resets complaint status to 'New' and blacklists current engineer.</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><AlertTriangle className="h-4 w-4" /></div>
                      <p className="text-[10px] font-bold text-muted-foreground">REJECT: Generates formal suspension order and blocks engineer access.</p>
                   </div>
                </div>
             </div>
          </div>

          <DialogFooter className="gap-3 sm:flex-col lg:flex-row">
            <Button 
              onClick={() => handleReviewDecision('accept')} 
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs shadow-glow-emerald transition-all active:scale-95"
            >
              Accept Justification
            </Button>
            <Button 
              onClick={() => handleReviewDecision('reject')} 
              className="flex-1 h-12 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-xs shadow-glow-destructive transition-all active:scale-95"
            >
              Reject & Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ISSUE NOTICE DIALOG */}
      <Dialog open={noticeModalOpen} onOpenChange={setNoticeModalOpen}>
        <DialogContent className="sm:max-w-[450px] glass-strong border-destructive/20 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <AlertOctagon className="h-5 w-5" /> Issue Disciplinary Notice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Notice Message</h4>
                <textarea 
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  className="w-full h-32 bg-secondary/30 border border-destructive/20 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-destructive"
                />
             </div>
             <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-xs text-destructive font-bold">
                  This notice will be pinned to the engineer's terminal and requires a mandatory response.
                </p>
             </div>
          </div>

          <DialogFooter>
             <Button variant="ghost" onClick={() => setNoticeModalOpen(false)}>Cancel</Button>
             <Button onClick={handleSendNotice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold shadow-glow-destructive">
                Confirm & Send Notice
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

