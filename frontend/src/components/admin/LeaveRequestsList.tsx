import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { motion } from 'framer-motion';
import { Clock, Calendar, CheckCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeaveRequestsListProps {
  onStatusChange: () => void;
}

export function LeaveRequestsList({ onStatusChange }: LeaveRequestsListProps) {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(getApiUrl('/leave/all'));
      const data = await res.json();
      setLeaveRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    const admin_message = window.prompt(`Enter message for engineer (optional):`, status === 'Approved' ? 'Enjoy your leave.' : 'Insufficient bandwidth to approve at this time.');
    
    try {
      const res = await fetch(getApiUrl(`/leave/approve/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            status, 
            admin_message,
            admin_id: JSON.parse(localStorage.getItem('user') || '{}')._id // Assuming user ID is in localStorage
        })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Application ${status}`);
      fetchLeaveRequests();
      onStatusChange(); // Refresh engineer status in parent
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (fetching) return <div className="text-center py-20 font-bold text-muted-foreground">Synchronizing Personnel Records...</div>;

  const pending = leaveRequests.filter(l => l.status === 'Pending');
  const history = leaveRequests.filter(l => l.status !== 'Pending');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tighter text-rose-500 flex items-center gap-2">
          <Clock className="h-5 w-5" /> Pending Approval
          <Badge className="bg-rose-500 animate-bounce text-white shadow-glow">{pending.length} ACTION REQUIRED</Badge>
        </h2>
        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          {pending.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-3xl text-muted-foreground italic">No pending leave requests</div>
          ) : (
            pending.map(l => (
              <Card key={l._id} className="p-6 glass-panel border-2 border-rose-500 bg-rose-500/10 shadow-glow-orange animate-pulse overflow-hidden relative group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{l.engineer_id?.name || 'Engineer'}</h4>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{l.engineer_id?.dept_name || 'Operations'}</p>
                  </div>
                  <Badge className="text-[10px] uppercase font-black tracking-widest bg-rose-500 text-white animate-bounce shadow-md">PENDING APPROVAL</Badge>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <span>{new Date(l.duration_from).toLocaleDateString()} - {new Date(l.duration_to).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm bg-secondary/60 p-3 rounded-xl border border-border/40 italic text-foreground">"{l.reason}"</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleAction(l._id, 'Approved')} className="flex-1 bg-rose-500 text-white hover:bg-rose-600 font-black text-xs uppercase tracking-widest h-10 shadow-glow">Approve</Button>
                  <Button onClick={() => handleAction(l._id, 'Rejected')} variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 font-black text-xs uppercase tracking-widest h-10">Reject</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tighter text-muted-foreground flex items-center gap-2">
          <CheckCircle className="h-5 w-5" /> Decision History
        </h2>
        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          {history.map(l => (
            <div key={l._id} className="p-4 rounded-xl border border-border/40 bg-card/50 flex items-center justify-between opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${l.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'}`}>
                  {l.status === 'Approved' ? <CheckCircle className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{l.engineer_id?.name || 'Engineer'}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground">{new Date(l.duration_from).toLocaleDateString()} - {new Date(l.duration_to).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge className={l.status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'}>{l.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
