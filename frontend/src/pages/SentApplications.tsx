import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, MapPin, Clock, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Complaint {
    id?: string;
    _id?: string;
    issue_type: string;
    description: string;
    address?: string;
    latitude: number;
    longitude: number;
    status: string;
    severity: string;
    reference_number: string;
    predicted_days: number;
    before_image?: string;
    created_at: string;
    is_reassigned?: boolean;
}

export default function SentApplications() {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = useCallback(async () => {
        try {
            const res = await fetch(getApiUrl(`/complaints?user_id=${user?._id || user?.id}`));
            const data = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
            setComplaints(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchComplaints();
    }, [user, fetchComplaints]);

    const handleDelete = async (id: string, ref: string) => {
        if (!window.confirm(`Are you sure you want to withdraw and delete complaint ${ref}?`)) return;
        
        try {
            const res = await fetch(getApiUrl(`/complaints/${id}`), {
                method: 'DELETE',
            });
            const data = await res.text().then(t => { try { return t ? JSON.parse(t) : {}; } catch { return {}; } });
            if (!res.ok) throw new Error(data.error || "Delete failed");
            toast.success("Complaint withdrawn successfully");
            fetchComplaints();
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Forwarded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Assigned': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'In Progress': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'Resolved': return 'gradient-primary text-white border-primary/20 shadow-glow';
            case 'Closed': return 'bg-secondary text-muted-foreground border-border';
            default: return 'bg-secondary text-foreground';
        }
    };

    const getSeverityBadge = (sev: string) => {
        if (sev === 'High') return <Badge variant="destructive" className="animate-pulse shadow-glow">High Severity</Badge>;
        if (sev === 'Medium') return <Badge variant="default" className="bg-orange-500 hover:bg-orange-500">Medium Severity</Badge>;
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500">Low Severity</Badge>;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
                <DashboardSidebar />
                <main className="flex-1 container max-w-5xl py-8 overflow-y-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" /> Track Application
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">History of all civic issues and applications you have drafted and submitted to the authorities.</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-muted-foreground">Loading history...</div>
                    ) : !Array.isArray(complaints) || complaints.length === 0 ? (
                        <Card className="glass-panel border-dashed p-12 text-center">
                            <p className="text-muted-foreground font-medium">No applications sent yet.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {complaints.map((c) => (
                                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
                                        <Card className="glass-panel overflow-hidden border-border/40 hover:border-primary/30 transition-colors">
                                            <div className="p-5 flex flex-col md:flex-row gap-5 items-start">
                                                    <div className="w-full md:w-40 h-32 shrink-0 rounded-xl overflow-hidden border border-border/50 relative group">
                                                        <SafeImage src={c.before_image} alt="Issue" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        <div className="absolute top-1 left-1">{getSeverityBadge(c.severity)}</div>
                                                    </div>
                                                <div className="flex-1 min-w-0 w-full">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h3 className="font-bold text-foreground text-xl capitalize truncate">{c.issue_type.replace('_', ' ')}</h3>
                                                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                                                                <MapPin className="h-3.5 w-3.5 mr-1" /> {c.address || `${c.latitude}, ${c.longitude}`}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {c.status === 'New' && (
                                                                <button 
                                                                    onClick={() => handleDelete(c.id || c._id, c.reference_number)}
                                                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                                                                    title="Withdraw Complaint"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            )}
                                                            <span className={`px-3 py-1 text-sm font-bold rounded-full border ${getStatusColor(c.status)}`}>
                                                                {c.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-secondary/40 border border-border/40 p-3 rounded-lg mb-3 mt-2">
                                                        <p className="text-[15px] text-foreground font-medium whitespace-pre-wrap">{c.description}</p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-muted-foreground">
                                                        <span className="flex items-center"><Clock className="h-4 w-4 mr-1.5" /> Ref: {c.reference_number}</span>
                                                        <span className="flex items-center"><AlertCircle className="h-4 w-4 mr-1.5 text-primary" /> AI Est. Resolution: {c.predicted_days} Days</span>
                                                        {c.is_reassigned && (
                                                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 font-black text-[10px] animate-pulse">
                                                                RE-ASSIGNED TO NEW ENGINEER
                                                            </Badge>
                                                        )}
                                                        {c.created_at && <span className="flex items-center text-foreground/60 ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
