import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function ModifyApplication() {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) fetchComplaints();
    }, [user]);

    const fetchComplaints = async () => {
        try {
            const res = await fetch(getApiUrl(`/complaints?user_id=${user?.id}`));
            const data = await res.json();
            setComplaints(data.filter((c: any) => c.status === 'New'));
        } catch (err) {
            toast.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (c: any) => {
        setEditingId(c.id);
        setEditDesc(c.description);
    };

    const handleSave = async (id: string) => {
        setSaving(true);
        try {
            const res = await fetch(getApiUrl(`/complaints/${id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: editDesc })
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success("Application successfully updated!");
            setEditingId(null);
            fetchComplaints();
        } catch (err) {
            toast.error("Failed to update application");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
                <DashboardSidebar />
                <main className="flex-1 container max-w-5xl py-8 overflow-y-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <Edit className="h-8 w-8 text-orange-500" /> Modify Application
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium">Edit the details of applications that have not yet been assigned or forwarded.</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-muted-foreground">Loading applications...</div>
                    ) : complaints.length === 0 ? (
                        <Card className="glass-panel border-dashed p-12 text-center">
                            <p className="text-muted-foreground font-medium">No modifiable applications found. Applications can only be edited when their status is 'New'.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-6 grid-cols-1">
                            <AnimatePresence>
                                {complaints.map((c) => (
                                    <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <Card className="glass-panel border-border/40 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 shadow-none border border-orange-500/20">{c.issue_type.replace('_', ' ')}</Badge>
                                                            <Badge variant="outline" className="text-muted-foreground">Ref: {c.reference_number}</Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-medium">{c.address || 'Location provided via map pin'}</p>
                                                    </div>
                                                    {editingId !== c.id && (
                                                        <Button onClick={() => startEditing(c)} variant="outline" className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10">
                                                            <Edit className="h-4 w-4 mr-2" /> Edit Details
                                                        </Button>
                                                    )}
                                                </div>

                                                {editingId === c.id ? (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-border/50">
                                                        <label className="text-sm font-bold text-foreground">Update Application Description (Under 400 words):</label>
                                                        <Textarea
                                                            value={editDesc}
                                                            onChange={(e) => setEditDesc(e.target.value)}
                                                            className="min-h-[150px] bg-background border-orange-500/40 focus:border-orange-500 resize-y p-3"
                                                        />
                                                        <div className="flex justify-end gap-3 pb-2">
                                                            <Button variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
                                                                <X className="h-4 w-4 mr-2" /> Cancel
                                                            </Button>
                                                            <Button onClick={() => handleSave(c.id)} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white shadow-glow">
                                                                {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <div className="bg-secondary/30 p-4 rounded-lg border border-border/40 text-[15px] font-medium text-foreground whitespace-pre-wrap">
                                                        {c.description}
                                                    </div>
                                                )}
                                            </CardContent>
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
