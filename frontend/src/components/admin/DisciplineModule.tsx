import { useState, useEffect } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { 
  Shield, Users, AlertTriangle, CheckCircle, 
  Search, MoreVertical, Eye, FileText,
  AlertOctagon, Ban, History, Download, 
  Clock, Info, RefreshCw, RotateCcw, ClipboardCheck, XCircle, MessageSquare, ShieldOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton";

interface Engineer {
  id: string;
  _id: string;
  name: string;
  department: string;
  assigned: number;
  violations: number;
  lateTasks: number;
  complianceScore: number;
  status: string;
  is_suspended: boolean;
  suspension_until?: string | null;
  suspension_appeal?: {
    submitted: boolean;
    statement: string | null;
    supporting_document: string | null;
    submitted_at: string | null;
    status: 'Pending' | 'Approved' | 'Rejected';
    admin_notes: string | null;
    reviewed_at: string | null;
  } | null;
  email: string;
  phone: string;
}

interface DisciplinaryLog {
  _id: string;
  engineer_id: string;
  admin_id: string;
  complaint_id: {
    reference_number: string;
    issue_type: string;
    status: string;
  };
  message: string;
  reason: string;
  evidence_image?: string;
  responded: boolean;
  admin_decision: string;
  admin_notes: string;
  created_at: string;
}

interface DisciplineData {
  engineers: Engineer[];
  summary: {
    totalEngineers: number;
    violationsToday: number;
    activeWarnings: number;
    suspendedEngineers: number;
  };
}

export default function DisciplineModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DisciplineData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [logs, setLogs] = useState<DisciplinaryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // --- Appeal Review State ---
  const [appealNotes, setAppealNotes] = useState('');
  const [reviewingAppeal, setReviewingAppeal] = useState(false);

  // --- Revoke Suspension State ---
  const [revokeSuspensionReason, setRevokeSuspensionReason] = useState('');
  const [revokingSuspension, setRevokingSuspension] = useState(false);

  useEffect(() => {
    fetchDisciplineData();
  }, []);

  const fetchDisciplineData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/engineers/discipline'));
      if (!res.ok) throw new Error("Failed to load compliance data");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (id: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(getApiUrl(`/engineers/discipline/${id}/logs`));
      const result = await res.json();
      setLogs(result);
    } catch (err) {
      toast.error("Failed to load violation logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAction = async (engineerId: string, action: string) => {
    try {
      const res = await fetch(getApiUrl('/engineers/discipline/action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineerId, action, reason: "Manual admin action" })
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`${action} applied successfully`);
      fetchDisciplineData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReviewAppeal = async (engineerId: string, action: 'approve' | 'reject') => {
    setReviewingAppeal(true);
    try {
      const res = await fetch(getApiUrl(`/engineers/suspension/appeal/${engineerId}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_notes: appealNotes })
      });
      if (!res.ok) throw new Error('Appeal review failed');
      if (action === 'approve') {
        toast.success('✅ Appeal Approved. Suspension lifted — engineer account restored.');
      } else {
        toast.error('❌ Appeal Rejected. Suspension remains in effect.');
      }
      setAppealNotes('');
      setDetailsModalOpen(false);
      fetchDisciplineData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReviewingAppeal(false);
    }
  };

  const handleRevokeSuspension = async (engineerId: string) => {
    if (!window.confirm('Are you sure you want to revoke this suspension? The engineer will immediately regain full access.')) return;
    setRevokingSuspension(true);
    try {
      const res = await fetch(getApiUrl(`/engineers/${engineerId}/revoke-suspension`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeSuspensionReason || 'Suspension revoked by administrator.' })
      });
      if (!res.ok) throw new Error('Failed to revoke suspension');
      toast.success('✅ Suspension revoked. Engineer account fully restored.');
      setRevokeSuspensionReason('');
      setDetailsModalOpen(false);
      fetchDisciplineData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRevokingSuspension(false);
    }
  };

  // State to manage the two-step "Not Satisfied" flow
  const [pendingRejectionNoticeId, setPendingRejectionNoticeId] = useState<string | null>(null);
  const [suspensionPdfUrl, setSuspensionPdfUrl] = useState<string | null>(null);
  const [pdfOpenedConfirmed, setPdfOpenedConfirmed] = useState(false);

  // --- Handle review of engineer justification ---
  // 'accept' path: Re-assigns complaint to another engineer automatically.
  // 'reject' path: Generates 30-day suspension PDF, forces admin to view it, then locks the engineer account.
  const handleReviewNotice = async (noticeId: string, action: 'accept' | 'reject', notes: string, days: number) => {
    try {
      const res = await fetch(getApiUrl(`/complaints/notices/${noticeId}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, suspension_days: days })
      });
      if (!res.ok) throw new Error("Review submission failed");
      const data = await res.json();
      
      if (action === 'accept') {
        toast.success("✅ Justification Accepted. Complaint auto-reassigned to another engineer.");
        setDetailsModalOpen(false);
        fetchDisciplineData();
      } else {
        // Store the PDF URL from the response for the mandatory view step
        const pdfPath = data.suspension_letter;
        const backendBase = getBaseUrl();
        setSuspensionPdfUrl(`${backendBase}${pdfPath}`);
        setPendingRejectionNoticeId(noticeId);
        toast.warning("⚠️ Suspension order generated. You MUST review the PDF report before confirming.");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Called when admin opens the PDF report link — unlocks the confirm button
  const handleOpenSuspensionPdf = () => {
    if (suspensionPdfUrl) {
      window.open(suspensionPdfUrl, '_blank');
      setPdfOpenedConfirmed(true);
    }
  };

  // Final confirmation after the admin has viewed the PDF
  const handleConfirmSuspension = () => {
    setPendingRejectionNoticeId(null);
    setSuspensionPdfUrl(null);
    setPdfOpenedConfirmed(false);
    setDetailsModalOpen(false);
    fetchDisciplineData();
    toast.error("🚫 Engineer access permanently blocked. 30-day suspension enforced.");
  };

  const openDetails = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    fetchLogs(engineer.id || engineer._id);
    setDetailsModalOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (score >= 50) return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Good': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GOOD</Badge>;
      case 'Warning': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">WARNING</Badge>;
      case 'Critical': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">CRITICAL</Badge>;
      case 'Suspend Candidate': return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">SUSPEND READY</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl bg-secondary/50" />)}
        </div>
        <Skeleton className="h-[500px] rounded-2xl bg-secondary/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-black text-foreground mb-2">Failed to load compliance data</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <Button onClick={fetchDisciplineData} className="gradient-primary">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  const engineers = data?.engineers || [];
  const filteredEngineers = engineers.filter((eng: Engineer) => {
    const matchesSearch = eng.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "All" || eng.department === deptFilter;
    const matchesStatus = statusFilter === "All" || eng.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = ["All", ...new Set(engineers.map((e: Engineer) => e.department))];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-destructive" /> Compliance & Discipline
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Monitor engineer accountability and enforce operational discipline.</p>
        </div>
        <div className="hidden md:flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold bg-secondary/20 border-border/40">
                <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Engineers', value: data.summary.totalEngineers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Violations Today', value: data.summary.violationsToday, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Active Warnings', value: data.summary.activeWarnings, icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Suspended Engineers', value: data.summary.suspendedEngineers, icon: Ban, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { 
            label: 'Pending Appeals', 
            value: engineers.filter((e: Engineer) => e.is_suspended && e.suspension_appeal?.submitted && e.suspension_appeal?.status === 'Pending').length,
            icon: RotateCcw, 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10' 
          },
        ].map((stat, i) => (
          <Card key={i} className="glass-panel border-border/40 hover:border-border transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform`} />
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-4xl font-black text-foreground mb-1">{stat.value}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTER PANEL */}
      <Card className="glass-panel border-border/40 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search engineer name..." 
              className="pl-10 h-11 bg-secondary/30 border-border/40 rounded-xl font-medium" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-11 bg-secondary/30 border border-border/40 rounded-xl px-4 text-sm font-bold focus:ring-1 focus:ring-primary outline-none min-w-[150px] appearance-none cursor-pointer"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {(departments as string[]).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            className="h-11 bg-secondary/30 border border-border/40 rounded-xl px-4 text-sm font-bold focus:ring-1 focus:ring-primary outline-none min-w-[150px] appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Good">Good</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
            <option value="Suspend Candidate">Suspend Candidate</option>
          </select>
        </div>
      </Card>

      {/* ENGINEER DISCIPLINE TABLE */}
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/30 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/50 border-b border-border/40">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engineer Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Department</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Violations</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredEngineers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-50">
                        <Users className="h-12 w-12 mb-2 text-muted-foreground" />
                        <p className="font-bold text-lg text-muted-foreground italic">No discipline records found matching your criteria</p>
                        <p className="text-sm text-muted-foreground">Start monitoring engineer compliance by assigning tasks.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEngineers.map((eng: Engineer) => (
                  <tr key={eng.id || eng._id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-xs ${getScoreColor(eng.complianceScore)}`}>
                          {eng.name.charAt(0)}
                        </div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors">{eng.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-muted-foreground">{eng.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black">{eng.assigned}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-black ${eng.violations > 0 ? 'text-destructive animate-pulse' : 'text-emerald-500'}`}>
                        {eng.violations}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-lg font-black ${getScoreColor(eng.complianceScore).split(' ')[0]}`}>
                        {eng.complianceScore}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(eng.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl h-9 hover:bg-secondary/80 font-bold"
                          onClick={() => openDetails(eng)}
                        >
                          <Eye className="h-4 w-4 mr-2" /> Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-panel border-border/40 w-48">
                              <DropdownMenuItem onClick={() => handleAction(eng.id || eng._id, 'WARNING')} className="font-bold focus:bg-orange-500/10 focus:text-orange-500 cursor-pointer p-3">
                                  <AlertOctagon className="h-4 w-4 mr-2" /> Issue Warning
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(eng.id || eng._id, 'PENALTY')} className="font-bold focus:bg-destructive/10 focus:text-destructive cursor-pointer p-3">
                                  <AlertTriangle className="h-4 w-4 mr-2" /> Apply Penalty
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(eng.id || eng._id, 'SUSPEND')} className="font-bold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer p-3">
                                  <Ban className="h-4 w-4 mr-2" /> Suspend
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILS MODAL */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl glass-panel border-border/40 rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-0">
            <div className="flex justify-between items-start">
               <div className="flex gap-4 text-left">
                  <div className={`h-16 w-16 rounded-3xl flex shrink-0 items-center justify-center font-black text-2xl shadow-glow-sm ${selectedEngineer ? getScoreColor(selectedEngineer.complianceScore) : ''}`}>
                    {selectedEngineer?.name?.charAt(0)}
                  </div>
                  <div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black tracking-widest mb-1">PRO-RESOLVER UNIT</Badge>
                    <DialogTitle className="text-3xl font-black text-foreground">{selectedEngineer?.name}</DialogTitle>
                    <p className="text-muted-foreground font-bold">{selectedEngineer?.department}</p>
                  </div>
               </div>
               <div className="text-right">
                  <div className={`text-4xl font-black ${selectedEngineer ? getScoreColor(selectedEngineer.complianceScore).split(' ')[0] : ''}`}>{selectedEngineer?.complianceScore}</div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Compliance Score</div>
               </div>
            </div>
          </DialogHeader>

          <div className="p-8 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-secondary/20 rounded-2xl border border-border/20 text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Total Assignments</p>
                   <p className="text-xl font-black">{selectedEngineer?.assigned}</p>
                </div>
                <div className="p-4 bg-secondary/20 rounded-2xl border border-border/20 text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Critical Violations</p>
                   <p className="text-xl font-black text-destructive">{selectedEngineer?.violations}</p>
                </div>
                <div className="p-4 bg-secondary/20 rounded-2xl border border-border/20 text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Late Resolutions</p>
                   <p className="text-xl font-black text-orange-500">{selectedEngineer?.lateTasks}</p>
                </div>
             </div>

             {/* REVOKE SUSPENSION SECTION — shown prominently when engineer is suspended */}
             {selectedEngineer?.is_suspended && (
               <div className="mt-4 p-5 rounded-2xl border-2 border-red-500/40 bg-red-500/5">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                     <ShieldOff className="h-5 w-5 text-destructive" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black uppercase tracking-widest text-destructive">Revoke Suspension</h3>
                     <p className="text-[10px] text-muted-foreground font-medium">Admin override — immediately restores engineer access</p>
                   </div>
                   {selectedEngineer.suspension_until && (
                     <div className="ml-auto text-right">
                       <p className="text-[9px] font-black uppercase text-destructive/70">Suspended Until</p>
                       <p className="text-xs font-black text-destructive">
                         {new Date(selectedEngineer.suspension_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                       </p>
                     </div>
                   )}
                 </div>

                 <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 mb-4">
                   <p className="text-[10px] font-bold text-destructive leading-relaxed">
                     ⚠️ Revoking this suspension will: Restore login access · Set status to Available · Clear all suspension flags · Mark any pending appeal as Approved
                   </p>
                 </div>

                 <div className="space-y-3">
                   <div>
                     <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Reason for Revocation (Optional)</label>
                     <textarea
                       value={revokeSuspensionReason}
                       onChange={(e) => setRevokeSuspensionReason(e.target.value)}
                       placeholder="Enter the reason you are revoking this suspension (e.g., new evidence, disciplinary period served early, administrative decision)..."
                       className="w-full h-20 bg-secondary/30 border border-destructive/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-destructive focus:outline-none transition-all resize-none"
                     />
                   </div>
                   <Button
                     disabled={revokingSuspension}
                     onClick={() => handleRevokeSuspension(selectedEngineer.id || selectedEngineer._id)}
                     className="w-full h-11 bg-destructive hover:bg-destructive/80 text-white font-black uppercase tracking-widest text-xs shadow-glow-destructive"
                   >
                     {revokingSuspension ? (
                       <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</span>
                     ) : (
                       <span className="flex items-center gap-2"><ShieldOff className="h-4 w-4" /> Revoke Suspension & Restore Access</span>
                     )}
                   </Button>
                 </div>
               </div>
             )}

             <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                   <History className="h-4 w-4" /> Disciplinary Timeline
                </h3>
                
                {loadingLogs ? (
                   <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-secondary/30" />)}
                   </div>
                ) : logs.length === 0 ? (
                   <div className="p-12 text-center bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground italic">
                      Zero disciplinary logs found. Excellent compliance record.
                   </div>
                ) : (
                   <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/40">
                      {logs.map((log, i) => (
                         <div key={log._id || i} className="relative pl-10 group text-left">
                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center ${log.admin_decision === 'Rejected' ? 'bg-destructive' : 'bg-primary'}`}>
                                <div className="h-1.5 w-1.5 rounded-full bg-background" />
                            </div>
                             <div className="p-4 glass-panel border-border/20 rounded-2xl">
                               <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-sm">Case REF: {log.complaint_id?.reference_number || 'N/A'}</h4>
                                  <Badge variant="outline" className={`text-[10px] uppercase font-black ${log.admin_decision === 'Rejected' ? 'text-destructive' : 'text-emerald-500'}`}>{log.admin_decision}</Badge>
                               </div>
                               <p className="text-xs text-muted-foreground mb-2 italic">Notice: "{log.message}"</p>
                               {log.responded && (
                                 <div className={`mt-3 p-4 rounded-2xl border-2 transition-all ${
                                   log.admin_decision === 'Pending' || !log.admin_decision 
                                     ? 'bg-red-600/15 border-red-500 shadow-xl shadow-red-600/20' 
                                     : 'bg-secondary/30 border-border/30'
                                 }`}>
                                   {(log.admin_decision === 'Pending' || !log.admin_decision) && (
                                     <div className="flex items-center gap-2 mb-3 bg-red-600 text-white p-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider animate-pulse shadow-md shadow-red-600/40">
                                       <AlertTriangle className="h-4 w-4 shrink-0" /> ENGINEER RESPONDED — IMMEDIATE REVIEW REQUIRED
                                     </div>
                                   )}
                                   <p className="text-[10px] font-black uppercase text-primary mb-1">Engineer Justification:</p>
                                   <p className="text-xs font-medium italic mb-3">"{log.reason}"</p>
                                   {log.evidence_image && (
                                     <div className="rounded-lg overflow-hidden border border-border/50 mb-3">
                                       <img src={log.evidence_image} alt="Site Proof" className="w-full h-32 object-cover" />
                                     </div>
                                   )}
                                    {(log.admin_decision === 'Pending' || !log.admin_decision) && (
                                      // --- Two-button Satisfy / Not Satisfy decision panel ---
                                      <div className="space-y-3 mt-4">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Admin Decision Required:</p>
                                        <div className="flex gap-2">
                                          {/* SATISFIED: Accept justification and auto-reassign complaint */}
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleReviewNotice(log._id, 'accept', "Justification approved. Complaint re-assigned to a different engineer.", 0)} 
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-[10px] uppercase tracking-wider"
                                          >
                                            ✅ Satisfied
                                          </Button>
                                          {/* NOT SATISFIED: Trigger suspension flow + PDF */}
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleReviewNotice(log._id, 'reject', "Justification not satisfactory. 30-day mandatory suspension enforced.", 30)} 
                                            variant="destructive" 
                                            className="flex-1 font-bold h-9 text-[10px] uppercase tracking-wider shadow-glow-destructive"
                                          >
                                            ❌ Not Satisfied
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                 </div>
                               )}
                               <div className="flex justify-between items-center text-[10px] font-bold mt-3">
                                  <span className="text-primary flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(log.created_at).toLocaleDateString()}</span>
                                  <span className="text-muted-foreground uppercase">{log.complaint_id?.issue_type?.replace('_', ' ')}</span>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>

             {/* SUSPENSION APPEAL REVIEW PANEL */}
             {selectedEngineer?.is_suspended && selectedEngineer?.suspension_appeal?.submitted && (
               <div className="mt-6 p-5 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5">
                 <div className="flex items-center gap-2 mb-4">
                   <RotateCcw className="h-5 w-5 text-amber-500" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">Suspension Withdrawal Appeal</h3>
                   <Badge className={`ml-auto text-[10px] font-black uppercase ${
                     selectedEngineer.suspension_appeal.status === 'Pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                     : selectedEngineer.suspension_appeal.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                     : 'bg-destructive/20 text-destructive border-destructive/30'
                   }`}>
                     {selectedEngineer.suspension_appeal.status}
                   </Badge>
                 </div>

                 {/* Engineer's statement */}
                 <div className="p-3 bg-secondary/30 rounded-xl border border-border/30 mb-4">
                   <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 flex items-center gap-1">
                     <MessageSquare className="h-3 w-3" /> Engineer's Appeal Statement
                   </p>
                   <p className="text-sm font-medium text-foreground leading-relaxed italic">
                     "{selectedEngineer.suspension_appeal.statement || '(No statement provided)'}"
                   </p>
                   {selectedEngineer.suspension_appeal.submitted_at && (
                     <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                       <Clock className="h-3 w-3" /> Submitted on {new Date(selectedEngineer.suspension_appeal.submitted_at).toLocaleDateString()}
                     </p>
                   )}
                 </div>

                 {/* Supporting document */}
                 {selectedEngineer.suspension_appeal.supporting_document && (
                   <div className="rounded-xl overflow-hidden border border-amber-500/20 mb-4">
                     <img 
                       src={selectedEngineer.suspension_appeal.supporting_document} 
                       alt="Supporting Document"
                       className="w-full h-40 object-cover"
                     />
                     <p className="text-[10px] text-center text-muted-foreground font-bold py-2 bg-secondary/30 uppercase tracking-widest">Attached Supporting Document</p>
                   </div>
                 )}

                 {/* Decision panel — only show if still pending */}
                 {selectedEngineer.suspension_appeal.status === 'Pending' ? (
                   <div className="space-y-3">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Admin Decision Required:</p>
                     <div>
                       <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Admin Notes (Optional)</label>
                       <textarea
                         value={appealNotes}
                         onChange={(e) => setAppealNotes(e.target.value)}
                         placeholder="Add notes for the engineer explaining your decision..."
                         className="w-full h-20 bg-secondary/30 border border-border/40 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all resize-none"
                       />
                     </div>
                     <div className="flex gap-2">
                       <Button
                         size="sm"
                         disabled={reviewingAppeal}
                         onClick={() => handleReviewAppeal(selectedEngineer.id || selectedEngineer._id, 'approve')}
                         className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-[10px] uppercase tracking-wider"
                       >
                         <ClipboardCheck className="h-4 w-4 mr-1" /> Approve — Lift Suspension
                       </Button>
                       <Button
                         size="sm"
                         disabled={reviewingAppeal}
                         onClick={() => handleReviewAppeal(selectedEngineer.id || selectedEngineer._id, 'reject')}
                         variant="destructive"
                         className="flex-1 font-bold h-10 text-[10px] uppercase tracking-wider"
                       >
                         <XCircle className="h-4 w-4 mr-1" /> Reject Appeal
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <div className={`p-3 rounded-xl border ${
                     selectedEngineer.suspension_appeal.status === 'Approved'
                       ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                       : 'bg-destructive/10 border-destructive/30 text-destructive'
                   } text-xs font-bold`}>
                     {selectedEngineer.suspension_appeal.status === 'Approved' ? '✅ This appeal was approved. Suspension has been lifted.' : '❌ This appeal was rejected.'}
                     {selectedEngineer.suspension_appeal.admin_notes && (
                       <p className="text-muted-foreground font-medium mt-1 italic">Notes: "{selectedEngineer.suspension_appeal.admin_notes}"</p>
                     )}
                   </div>
                 )}
               </div>
             )}

             <div className="mt-8 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-start gap-4 text-left">
                <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">AI Recommendation</p>
                   <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      {selectedEngineer?.complianceScore >= 90 
                        ? "Top performing engineer. Eligible for incentive program and mentoring roles."
                        : selectedEngineer?.complianceScore >= 70
                        ? "Stable performance. Monitor recent minor delays in resolution feedback."
                        : selectedEngineer?.complianceScore >= 50
                        ? "High risk detected. Immediate performance review and retraining suggested."
                        : "Candidate for temporary suspension. Repeated violations detected in core protocols."}
                   </p>
                </div>
             </div>
          </div>

          <DialogFooter className="p-8 bg-secondary/10 border-t border-border/40">
             <div className="flex w-full justify-between items-center">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">RID: {selectedEngineer?.id || selectedEngineer?._id}</div>
                <Button onClick={() => setDetailsModalOpen(false)} className="rounded-xl px-8 font-black uppercase text-xs tracking-widest gradient-primary text-white">Close Dashboard</Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MANDATORY SUSPENSION PDF REVIEW MODAL ---
          This modal forces the admin to open and read the suspension PDF 
          BEFORE the suspension is confirmed as final. The "Confirm" button 
          only becomes active after the PDF has been opened. */}
      <Dialog open={!!pendingRejectionNoticeId} onOpenChange={() => {/* blocked: must confirm */}}>
        <DialogContent className="sm:max-w-[520px] glass-strong border-destructive/40 shadow-elevated">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-destructive uppercase tracking-tight">
                  Suspension Order Generated
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">30-Day Mandatory Suspension — CivicDrishti Bharat</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Open PDF */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${pdfOpenedConfirmed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                Step 1: Read Official Suspension Report (Mandatory)
              </p>
              <Button
                onClick={handleOpenSuspensionPdf}
                className={`w-full h-12 font-black uppercase tracking-wider text-sm ${pdfOpenedConfirmed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-destructive text-white hover:bg-destructive/90 animate-pulse'}`}
              >
                <FileText className="mr-2 h-5 w-5" />
                {pdfOpenedConfirmed ? '✅ Report Opened & Reviewed' : '📄 Open Suspension PDF Report'}
              </Button>
              {!pdfOpenedConfirmed && (
                <p className="text-[10px] text-destructive font-bold mt-2 text-center">
                  ⚠️ You must open and read the PDF report before confirming.
                </p>
              )}
            </div>

            {/* Step 2: Confirm Suspension (only enabled after PDF opened) */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${pdfOpenedConfirmed ? 'border-destructive/40 bg-destructive/5' : 'border-border/20 bg-secondary/10 opacity-40'}`}>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                Step 2: Confirm Final Suspension Action
              </p>
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 mb-4">
                <p className="text-xs text-destructive font-bold leading-relaxed">
                  🚫 This action will: Block engineer login for 30 days · Mark engineer as suspended · Auto-reassign the complaint
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pdfOpenedConfirmed}
                  onClick={() => {
                    // Cancel: reset state, go back to details
                    setPendingRejectionNoticeId(null);
                    setSuspensionPdfUrl(null);
                    setPdfOpenedConfirmed(false);
                  }}
                  className="flex-1 font-bold border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!pdfOpenedConfirmed}
                  onClick={handleConfirmSuspension}
                  className="flex-1 h-10 bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-xs shadow-glow-destructive"
                >
                  🔒 Confirm Suspension
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
