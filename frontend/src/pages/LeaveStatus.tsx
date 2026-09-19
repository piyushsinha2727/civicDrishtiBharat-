import { useState, useEffect } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Download, Clock, CheckCircle, XCircle, FileText, ExternalLink, Calendar, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function LeaveStatus() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(getApiUrl(`/leave/status/${user?._id || user?.id}`));
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
      setLeaves(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: 'pdf' | 'jpg', certUrl: string) => {
    // In a real app, this would trigger a download. Here we open in new tab.
    const url = `${getBaseUrl()}${certUrl}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
        <DashboardSidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-glow-orange">
                  <Bell className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Leave Status Panel</h1>
                  <p className="text-muted-foreground text-sm font-bold">Track your absence requests and download certificates</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-muted-foreground font-bold">Syncing Records...</div>
            ) : leaves.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border/50 bg-secondary/5">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-bold text-muted-foreground">No leave history found.</p>
                <p className="text-sm text-muted-foreground mt-1">Your leave applications will appear here once submitted.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {leaves.map((leave, index) => (
                    <motion.div 
                      key={leave._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`p-6 border ${leave.status === 'Approved' ? 'border-success/30 bg-success/5' : leave.status === 'Rejected' ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'} backdrop-blur-sm relative overflow-hidden group`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${leave.status === 'Approved' ? 'bg-success/20 text-success' : leave.status === 'Rejected' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                              {leave.status === 'Approved' ? <CheckCircle className="h-5 w-5" /> : leave.status === 'Rejected' ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={`font-black uppercase text-[10px] tracking-widest ${leave.status === 'Approved' ? 'border-success text-success' : leave.status === 'Rejected' ? 'border-destructive text-destructive' : 'border-primary text-primary'}`}>
                                  {leave.status}
                                </Badge>
                                <span className="text-xs font-bold text-muted-foreground">Applied on {new Date(leave.submitted_at).toLocaleDateString()}</span>
                              </div>
                              <h3 className="font-black uppercase text-sm mb-1">{leave.reason}</h3>
                              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {new Date(leave.duration_from).toLocaleDateString()} - {new Date(leave.duration_to).toLocaleDateString()}
                              </p>
                              {leave.admin_message && (
                                <p className="mt-3 text-xs italic bg-secondary/30 p-2 rounded-lg border border-border/30 font-medium">
                                  Admin Note: "{leave.admin_message}"
                                </p>
                              )}
                            </div>
                          </div>

                          {leave.status === 'Approved' && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <p className="text-[10px] font-black uppercase text-success tracking-tighter text-center md:text-right">Credential Ready</p>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleDownload('pdf', leave.certificate_pdf)} className="bg-success text-white font-black text-[10px] uppercase tracking-widest h-9 px-4 shadow-glow-success">
                                  <Download className="mr-2 h-3 w-3" /> PDF
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDownload('jpg', leave.certificate_jpg)} className="border-success text-success hover:bg-success/10 font-black text-[10px] uppercase tracking-widest h-9 px-4">
                                  <FileText className="mr-2 h-3 w-3" /> JPG
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
