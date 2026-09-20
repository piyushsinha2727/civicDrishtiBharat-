import { useState, useEffect } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, CheckCircle, Clock, MapPin, Upload, Camera, AlertTriangle, Hash, ShieldAlert, MessageSquare, Info, FileText, Download, Send, ClipboardCheck, XCircle, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ResolverDashboard() {
  const { user, updateUser } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution Flow
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Notice Flow
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [noticeResponse, setNoticeResponse] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [submittingNotice, setSubmittingNotice] = useState(false);

  // Suspension Appeal Flow
  const [appealStatement, setAppealStatement] = useState('');
  const [appealDocument, setAppealDocument] = useState<string | null>(null);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  const fetchProfile = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;
      const res = await fetch(getApiUrl(`/engineers/profile/${userId}`));
      if (res.ok) {
        const freshUser = await res.json();
        if (freshUser && freshUser.is_suspended !== user?.is_suspended) {
          updateUser({ ...user, ...freshUser });
        }
      }
    } catch (err) {
      console.error("Failed to sync profile status", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;
      const res = await fetch(getApiUrl(`/complaints?engineer_id=${userId}`));
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) return;
      const res = await fetch(getApiUrl(`/complaints/notices/${userId}`));
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
      setNotices(data);
    } catch (err) {
      console.error("Failed to fetch notices", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTasks();
      fetchNotices();
    }
  }, [user?._id, user?.id]);

  // Mandatory Alert Trigger
  useEffect(() => {
    const pendingNotice = notices.find(n => !n.responded);
    if (pendingNotice && !noticeModalOpen) {
      setSelectedNotice(pendingNotice);
      setNoticeModalOpen(true);
    }
  }, [notices, noticeModalOpen]);

  const openResolveModal = (task: any) => {
    setSelectedTask(task);
    setAfterImagePreview(null);
    setResolveModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAfterImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitResolution = async () => {
    if (!afterImagePreview) return toast.error("Please upload proof of resolution");

    setUploading(true);
    try {
      const payload = {
        complaint_id: selectedTask.id || selectedTask._id,
        engineer_id: user?._id || user?.id,
        after_image: afterImagePreview
      };

      const res = await fetch(getApiUrl('/complaints/resolve'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit resolution");

      toast.success(data.message);
      setResolveModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message, { duration: 5000 });
      if (err.message.includes("AI Warning")) {
        setAfterImagePreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const submitNoticeResponse = async () => {
    if (!noticeResponse.trim()) return toast.error("Please provide a reason/explanation");

    setSubmittingNotice(true);
    try {
      const res = await fetch(getApiUrl(`/complaints/notices/${selectedNotice._id}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason: noticeResponse,
          evidence_image: evidenceImage
        })
      });

      if (!res.ok) throw new Error("Failed to submit response");

      toast.success("Explanation submitted to Command Center.");
      setNoticeModalOpen(false);
      setNoticeResponse('');
      setSelectedNotice(null);
      await fetchNotices();
      await fetchTasks();
      setActiveTab('assignments');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingNotice(false);
    }
  };

  const submitSuspensionAppeal = async () => {
    if (!appealStatement.trim()) return toast.error('Please provide a formal appeal statement');
    setSubmittingAppeal(true);
    try {
      const engineerId = user?._id || user?.id;
      const res = await fetch(getApiUrl('/engineers/suspension/appeal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineer_id: engineerId,
          statement: appealStatement,
          supporting_document: appealDocument || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Appeal submission failed');
      toast.success('✅ Appeal submitted. Admin will review your request.');
      setAppealSubmitted(true);
      setAppealStatement('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
        <DashboardSidebar />
        
        {user?.is_suspended && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-lg w-full glass-strong border-2 border-destructive rounded-3xl shadow-glow-destructive my-6">
              
              {/* Header */}
              <div className="p-8 pb-4 text-center">
                <ShieldAlert className="h-14 w-14 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-1">Account Suspended</h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Disciplinary Action In Effect</p>
              </div>

              <div className="px-8 pb-4 space-y-4">
                {/* Suspension period */}
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-left">
                  <p className="text-[10px] font-black text-destructive flex items-center gap-2 mb-1 uppercase">
                    <Clock className="h-3 w-3" /> Suspended Until:
                  </p>
                  <p className="text-base font-black text-foreground">
                    {new Date(user.suspension_until || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* Download documents */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => user.disciplinary_notice_url && window.open(`${getBaseUrl()}${user.disciplinary_notice_url}`)}
                    className="flex-1 h-10 border-destructive/30 text-destructive font-black text-[10px] uppercase tracking-wider hover:bg-destructive/10"
                  >
                    <Download className="h-3 w-3 mr-1" /> Notice (JPG)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => user.suspension_letter && window.open(`${getBaseUrl()}${user.suspension_letter}`)}
                    className="flex-1 h-10 border-destructive/30 text-destructive font-black text-[10px] uppercase tracking-wider hover:bg-destructive/10"
                  >
                    <FileText className="h-3 w-3 mr-1" /> Order (PDF)
                  </Button>
                </div>

                {/* APPEAL SECTION */}
                <div className="border-t border-border/40 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-amber-500">Appeal for Suspension Withdrawal</p>
                  </div>

                  {/* Show current appeal status if already submitted */}
                  {user?.suspension_appeal?.submitted ? (
                    <div className={`p-4 rounded-2xl border-2 ${
                      user.suspension_appeal.status === 'Approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : user.suspension_appeal.status === 'Rejected'
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {user.suspension_appeal.status === 'Approved' && <ClipboardCheck className="h-5 w-5 text-emerald-500" />}
                        {user.suspension_appeal.status === 'Rejected' && <XCircle className="h-5 w-5 text-destructive" />}
                        {user.suspension_appeal.status === 'Pending' && <Clock className="h-5 w-5 text-amber-500 animate-pulse" />}
                        <p className={`text-xs font-black uppercase tracking-widest ${
                          user.suspension_appeal.status === 'Approved' ? 'text-emerald-500'
                          : user.suspension_appeal.status === 'Rejected' ? 'text-destructive'
                          : 'text-amber-500'
                        }`}>
                          Appeal {user.suspension_appeal.status}
                        </p>
                      </div>
                      {user.suspension_appeal.status === 'Pending' && (
                        <p className="text-xs text-muted-foreground font-medium">Your appeal is under review by the admin. You will be notified once a decision is made.</p>
                      )}
                      {user.suspension_appeal.status === 'Approved' && (
                        <p className="text-xs text-emerald-600 font-bold">🎉 Your appeal was approved! Your suspension has been withdrawn. Please re-login to access the system.</p>
                      )}
                      {user.suspension_appeal.status === 'Rejected' && (
                        <div>
                          <p className="text-xs text-destructive font-bold mb-1">Your appeal was rejected. Suspension remains active.</p>
                          {user.suspension_appeal.admin_notes && (
                            <p className="text-xs text-muted-foreground italic">Admin notes: "{user.suspension_appeal.admin_notes}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Appeal submission form */
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        If you believe the suspension is unjust or you have corrective documentation, submit a formal appeal below. The admin will review and may withdraw your suspension early.
                      </p>

                      <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Formal Appeal Statement *</label>
                        <textarea
                          value={appealStatement}
                          onChange={(e) => setAppealStatement(e.target.value)}
                          placeholder="Provide a detailed explanation of why your suspension should be reconsidered. Include any relevant corrective actions taken, new evidence, or extenuating circumstances..."
                          className="w-full h-28 bg-secondary/30 border border-amber-500/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Supporting Document (Optional)</label>
                        {appealDocument ? (
                          <div className="relative rounded-xl overflow-hidden border border-amber-500/30 group h-28">
                            <img src={appealDocument} alt="Supporting Document" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Button variant="secondary" size="sm" onClick={() => setAppealDocument(null)}>Remove</Button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all">
                            <Camera className="mb-1 h-6 w-6 text-amber-500 opacity-80" />
                            <span className="text-[10px] font-black text-amber-600 uppercase">Attach Proof / Certificate</span>
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setAppealDocument(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} />
                          </label>
                        )}
                      </div>

                      <Button
                        onClick={submitSuspensionAppeal}
                        disabled={submittingAppeal || !appealStatement.trim()}
                        className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs shadow-lg"
                      >
                        {submittingAppeal ? (
                          <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</span>
                        ) : (
                          <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Submit Formal Appeal</span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pt-2 border-t border-border/30">
                <Button variant="ghost" className="w-full font-bold text-muted-foreground uppercase text-xs" onClick={() => window.location.href='/'}>
                  Exit Terminal
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        <main className="container max-w-[1400px] py-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: OPERATIONAL GRID */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between min-h-[36px]">
                <h2 className="text-lg font-black uppercase text-foreground flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" /> Operational Task List
                </h2>
                <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary">
                  {Array.isArray(tasks) ? tasks.filter(t => !['Resolved', 'Closed'].includes(t.status)).length : 0} ACTIVE
                </Badge>
              </div>

              {loading ? (
                <div className="text-center p-12 text-muted-foreground bg-secondary/10 rounded-2xl border border-dashed border-border/50">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="font-bold uppercase tracking-widest text-xs">Syncing Field Telemetry...</p>
                </div>
              ) : !Array.isArray(tasks) || tasks.length === 0 ? (
                <Card className="glass-panel p-12 text-center text-muted-foreground flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-success/50 mb-4" />
                  <p className="font-medium text-lg">No active assignments.</p>
                  <p className="text-sm mt-1">Stand by for dispatch from Command Center.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {tasks.map(task => {
                      const isCompleted = ['Resolved', 'Closed'].includes(task.status);
                      return (
                        <motion.div key={task.id || task._id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                          <Card className={`glass-panel overflow-hidden border ${isCompleted ? 'opacity-70 border-success/30' : 'border-primary/20 hover:border-primary/50'} transition-all shadow-card h-full flex flex-col group`}>
                            <div className="relative h-44 w-full bg-secondary shrink-0 overflow-hidden">
                              {task.before_image ?
                                <img src={task.before_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Issue" /> :
                                <div className="flex h-full items-center justify-center"><AlertTriangle className="h-8 w-8 text-muted-foreground" /></div>
                              }
                              <div className="absolute top-3 right-3 flex gap-2">
                                <Badge className={`${isCompleted ? 'bg-success text-white px-4 border-none shadow-glow text-[10px] font-black' : 'bg-orange-500 text-white animate-pulse shadow-glow text-[10px] font-black uppercase tracking-widest'}`}>{task.status}</Badge>
                              </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-foreground text-md uppercase truncate">{task.issue_type?.replace('_', ' ')}</h3>
                                <span className="text-[10px] font-bold tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                  <Hash className="h-2.5 w-2.5 inline mr-0.5 text-primary" />{task.reference_number}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/80 line-clamp-2 flex-1 font-medium italic mb-4">"{task.description}"</p>
                              <div className="space-y-2 mb-4">
                                <p className="text-[10px] text-muted-foreground flex items-center bg-secondary/50 p-2 rounded-lg font-bold border border-border/30">
                                  <MapPin className="h-3 w-3 mr-2 text-primary" /> {task.address || "Localized Sector"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2">
                                {!isCompleted ? (
                                  <Button onClick={() => openResolveModal(task)} size="sm" className="w-full h-10 gradient-primary hover:shadow-glow font-black uppercase text-[11px] tracking-widest text-primary-foreground">
                                    Record Work Completion
                                  </Button>
                                ) : (
                                  <Button disabled size="sm" className="w-full h-10 bg-success/20 text-success border border-success/30 font-black uppercase text-[11px] tracking-widest">
                                    Resolved
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => { setSelectedTask(task); setViewModalOpen(true); }} className="w-full h-9 border-primary/10 hover:bg-primary/5 font-black uppercase text-[10px] tracking-widest">
                                    Inspection Profile
                                 </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: DISCIPLINARY ACTION CENTER */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-8 space-y-4">

                <div className="flex items-center justify-between min-h-[36px]">
                  <h2 className="text-lg font-black uppercase text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" /> Disciplinary Action Center
                  </h2>
                  {notices.filter(n => !n.responded).length > 0 && (
                    <Badge className="bg-destructive animate-bounce text-white shadow-glow-destructive font-black">
                      {notices.filter(n => !n.responded).length} URGENT
                    </Badge>
                  )}
                </div>

                {/* --- OFFICIAL SUSPENSION NOTICE CARD ---
                    Appears ONLY when an engineer is actively suspended (is_suspended: true).
                    When suspension is revoked (is_suspended: false), it is completely hidden. */}
                {user?.is_suspended && user?.suspension_letter && (
                  <div className="p-5 rounded-2xl border-2 border-destructive bg-destructive/10 shadow-glow-destructive backdrop-blur-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                        <ShieldAlert className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-destructive uppercase tracking-wider">Official Order Issued</p>
                        <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">Account Suspended</h3>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mb-4 leading-relaxed">
                      A formal suspension order has been issued against your account by the CivicDrishti Bharat Administration. 
                      Your login access has been revoked. Download the official PDF order below.
                    </p>
                    {/* Active Until date */}
                    {user?.suspension_until && (
                      <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30 mb-4">
                        <p className="text-[10px] font-black text-destructive uppercase tracking-wider">Suspended Until:</p>
                        <p className="text-sm font-black text-foreground">
                          {new Date(user.suspension_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {/* Download PDF Suspension Order */}
                    <Button
                      className="w-full min-h-[46px] h-auto py-2.5 px-4 bg-destructive hover:bg-destructive/90 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 whitespace-normal text-center transition-all"
                      onClick={() => {
                        const base = getBaseUrl();
                        window.open(`${base}${user.suspension_letter}`, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-white" />
                      <span className="leading-tight">Download Suspension Order (PDF)</span>
                    </Button>
                  </div>
                )}

                <Card className="glass-strong border-destructive/20 overflow-hidden shadow-elevated">
                  <div className="p-6 bg-destructive/10 border-b border-destructive/20">
                    <p className="text-[10px] font-black uppercase text-destructive tracking-widest mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Real-time Compliance Monitoring
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Pending Statements</span>
                      <span className="text-2xl font-black text-destructive">{notices.filter(n => !n.responded).length}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto hide-scrollbar">
                    {notices.length === 0 ? (
                      <div className="text-center py-10 opacity-40 grayscale">
                        <CheckCircle className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase">Clean Compliance Record</p>
                      </div>
                    ) : (
                      notices.map(notice => (
                        <div key={notice._id} className={`p-4 rounded-xl border leading-relaxed transition-all ${notice.responded ? 'bg-secondary/20 border-border/50 opacity-60' : 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-2">
                             <Badge variant="outline" className={`text-[9px] font-black ${notice.responded ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive'}`}>
                                {notice.responded ? 'RESOLVED' : 'ACTION REQUIRED'}
                             </Badge>
                             <span className="text-[9px] font-bold text-muted-foreground">
                                {new Date(notice.created_at).toLocaleDateString()}
                             </span>
                          </div>
                          
                          <p className="text-[11px] font-black text-foreground mb-1">REF: {notice.complaint_id?.reference_number || 'N/A'}</p>
                          <p className="text-xs font-bold text-muted-foreground italic mb-4 line-clamp-2">"{notice.message}"</p>
                          
                          {!notice.responded ? (
                            <Button 
                              onClick={() => { setSelectedNotice(notice); setNoticeModalOpen(true); }} 
                              className="w-full h-10 bg-destructive text-white hover:bg-destructive/90 font-black uppercase text-[10px] tracking-widest shadow-glow-destructive"
                            >
                               Submit Proper Reason
                            </Button>
                          ) : (
                            // If responded but admin rejected (suspension_letter exists in notice) show download
                            <div className="mt-2 space-y-2">
                              <div className="p-2 bg-success/10 rounded-lg border border-success/20 text-success text-[10px] font-bold">
                                <CheckCircle className="h-3 w-3 inline mr-1" /> Justification Submitted
                              </div>
                              {user?.is_suspended && notice.suspension_letter && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10 font-bold"
                                  onClick={() => {
                                    const base = getBaseUrl();
                                    window.open(`${base}${notice.suspension_letter}`, '_blank');
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" /> View Suspension Order
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-4 bg-secondary/30 border-t border-border/30">
                     <p className="text-[10px] font-bold text-muted-foreground text-center">
                        All statements are logged and forwarded to the Urban Command Center for review.
                     </p>
                  </div>
                </Card>
              </div>
            </div>

          </div>
        </main>

        {/* RESOLUTION UPLOAD DIALOG */}
        <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
          <DialogContent className="sm:max-w-[450px] glass-strong border-primary/20 shadow-elevated">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase">
                <Upload className="h-5 w-5 text-primary" /> Work Submission
              </DialogTitle>
              <p className="text-xs font-bold text-muted-foreground mt-2 leading-relaxed">
                CivicDrishti Bharat AI automatically verifies the state transition from Before to After. Ensure the site is clear.
              </p>
            </DialogHeader>

            <div className="my-4">
              {afterImagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/50 group shadow-elevated">
                  <img src={afterImagePreview} alt="Resolution" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Button variant="secondary" className="font-black uppercase text-xs tracking-widest" onClick={() => setAfterImagePreview(null)}>Retake Capture</Button>
                  </div>
                </div>
              ) : (
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/20 transition-all hover:bg-primary/5 hover:border-primary shadow-inner">
                  <Camera className="mb-2 h-10 w-10 text-primary opacity-80" />
                  <span className="text-xs font-black text-foreground uppercase tracking-widest">Tap to Scan Resolution Site</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              )}

              <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3 text-orange-500 text-[10px] font-bold">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <p>AI ADVISORY: System will cross-reference location telemetry and image delta. Do not attempt duplicate uploads.</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" className="font-bold uppercase text-xs" onClick={() => setResolveModalOpen(false)}>Abort</Button>
              <Button onClick={submitResolution} disabled={uploading || !afterImagePreview} className="gradient-primary text-primary-foreground shadow-glow font-black uppercase tracking-widest flex-1">
                {uploading ? 'Processing AI...' : 'Verify & Close Deployment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* RESPOND NOTICE DIALOG - MANDATORY */}
        <Dialog 
          open={noticeModalOpen} 
          onOpenChange={(open) => {
            // Prevent closing if notice is not responded
            if (!open && notices.some(n => !n.responded)) {
              toast.error("Mandatory: You must provide a formal explanation for the resolution conflict before proceeding.");
              return;
            }
            setNoticeModalOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-[500px] glass-strong border-destructive/20 shadow-elevated" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase text-destructive">
                <ShieldAlert className="h-6 w-6" /> Mandatory Explanatory Statement
              </DialogTitle>
              <p className="text-xs font-bold text-muted-foreground mt-2 leading-relaxed uppercase tracking-tighter">
                Formal explanation required for resolution conflict detected in Ref: {selectedNotice?.complaint_id?.reference_number}
              </p>
            </DialogHeader>

            <div className="my-4 space-y-4">
               <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/10 text-destructive text-sm font-bold flex items-start gap-3 italic">
                  <MessageSquare className="h-5 w-5 shrink-0" />
                  "{selectedNotice?.message}"
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Response Narrative</label>
                  <textarea 
                     value={noticeResponse}
                     onChange={(e) => setNoticeResponse(e.target.value)}
                     placeholder="Provide detailed reasoning for resolution conflict (e.g., site re-dumping, secondary failure, structural latency)..."
                     className="w-full h-32 bg-secondary/30 border border-border/50 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-destructive focus:outline-none transition-all"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Mandatory Site Proof (Current Photo)</label>
                  {evidenceImage ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border/50 group h-40">
                      <img src={evidenceImage} alt="Evidence" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Button variant="secondary" size="sm" onClick={() => setEvidenceImage(null)}>Retake</Button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 transition-all hover:bg-destructive/10">
                      <Camera className="mb-2 h-8 w-8 text-destructive opacity-80" />
                      <span className="text-[10px] font-black text-destructive uppercase">Tap to Capture Site Evidence</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setEvidenceImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  )}
               </div>
            </div>

            <DialogFooter className="gap-2">
              <Button onClick={submitNoticeResponse} disabled={submittingNotice || !noticeResponse || !evidenceImage} className="bg-destructive text-white hover:opacity-90 shadow-glow-destructive font-black uppercase tracking-widest flex-1">
                {submittingNotice ? 'Transmitting...' : 'Transmit Statement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* TASK DETAIL DIALOG */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="sm:max-w-[600px] glass-strong border-primary/20 shadow-elevated max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
                 <ShieldAlert className="h-6 w-6 text-primary" /> Inspection Profile
              </DialogTitle>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-6 py-4">
                 <div className="rounded-2xl overflow-hidden border border-border/50 bg-secondary aspect-video relative group shadow-elevated">
                    {selectedTask.before_image ? 
                      <img src={selectedTask.before_image} alt="Issue" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" /> :
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">Telemetry Evidence Offline</div>
                    }
                    <div className="absolute top-4 right-4 focus:outline-none">
                       <Badge className="bg-orange-500 text-white shadow-glow font-black border-none uppercase tracking-widest text-[10px]">{selectedTask.status}</Badge>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Protocol Reference</h4>
                       <p className="font-mono text-sm font-black text-primary bg-primary/5 px-2 py-1 rounded inline-block">{selectedTask.reference_number}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Anomaly Category</h4>
                       <p className="text-sm font-black uppercase text-foreground/90">{selectedTask.issue_type?.replace('_', ' ')}</p>
                    </div>
                 </div>

                 <div className="p-5 bg-secondary/30 rounded-2xl border border-border/30 backdrop-blur-sm">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-2">
                       <Info className="h-3 w-3" /> Strategic Objective
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                       {selectedTask.description || "Field operative is directed to inspect regional infrastructure anomaly. Prioritize safety and document state delta."}
                    </p>
                 </div>

                 <div className="flex items-center gap-4 p-4 border border-border/20 rounded-2xl">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                       <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Deployment Geocode</h4>
                       <p className="text-sm font-bold text-foreground/80">{selectedTask.address || "Localized Sector Perimeter"}</p>
                    </div>
                 </div>

                 <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex justify-between items-center shadow-inner">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600">
                          <Clock className="h-6 w-6" />
                       </div>
                       <div>
                          <h4 className="text-[10px] font-black uppercase text-orange-600 mb-0.5 tracking-tighter">Deadline Synchronization</h4>
                          <p className="text-[10px] font-bold text-orange-500/80">
                             INIT: {new Date(selectedTask.assigned_at).toLocaleString()}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <CountdownTimer deadline={selectedTask.deadline} />
                    </div>
                 </div>

                 <Button onClick={() => setViewModalOpen(false)} className="w-full h-12 bg-secondary hover:bg-secondary/80 font-black uppercase tracking-widest text-xs transition-all">
                    Return to Operational Grid
                 </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// MODULAR COUNTDOWN COMPONENT
function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');

  useEffect(() => {
    if (!deadline) return;
    
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      let str = "";
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      setTimeLeft(str);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className={`px-4 py-1.5 rounded-lg border font-mono font-black text-sm flex items-center gap-2 ${timeLeft === 'EXPIRED' ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-background/50 text-foreground border-border/50 shadow-sm'}`}>
      <div className={`h-2 w-2 rounded-full ${timeLeft === 'EXPIRED' ? 'bg-destructive' : 'bg-orange-500 animate-pulse'}`} />
      {timeLeft}
    </div>
  );
}
