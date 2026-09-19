import { useState } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FileText, ArrowLeft, Loader2, Image as ImageIcon, MapPin, CheckCircle } from 'lucide-react';

export default function FileComplaint() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState<any>(null);

    const state = location.state as any;

    if (!state || !state.analysis) {
        return <Navigate to="/dashboard" replace />;
    }

    const { analysis, location: coords, address } = state;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address && !coords) return toast.error("Please provide a location on the dashboard first");

        const words = description.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (words > 400) {
            return toast.error("Description must be under 400 words.");
        }
        if (words === 0) {
            return toast.error("Please provide a description.");
        }

        setSubmitting(true);
        try {
            const payload = {
                user_email: user?.email,
                issue_type: analysis.issueType,
                description: description,
                latitude: coords?.lat,
                longitude: coords?.lng,
                address,
                image_url: analysis.imageBase64 || analysis.imageUrl,
            };

            const res = await fetch(getApiUrl('/complaints'), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSubmittedData(data);
            toast.success(`Complaint Submitted successfully! Ref: ${data.ref}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to file the complaint");
        } finally {
            setSubmitting(false);
        }
    };

    const wordCount = description.trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 container max-w-3xl py-8 overflow-y-auto">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 hover:bg-secondary">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dispatch
                </Button>

                <AnimatePresence mode="wait">
                    {!submittedData ? (
                        <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
                            <Card className="glass-panel border-border/50 shadow-elevated">
                                <CardHeader className="bg-primary/5 border-b border-border/50 pb-6 rounded-t-xl">
                                    <CardTitle className="text-3xl font-extrabold flex items-center gap-3 text-foreground">
                                        <FileText className="h-7 w-7 text-primary" />
                                        File a Complaint
                                    </CardTitle>
                                    <CardDescription className="text-base text-muted-foreground mt-2">
                                        Draft a formal application to securely report this issue directly to the authorities.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-8 space-y-8">

                                    {/* Context display section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                        <div className="md:col-span-1 rounded-xl overflow-hidden border border-border/50 h-32 relative bg-secondary/20 flex items-center justify-center">
                                            {analysis.imageUrl ? (
                                                <img src={analysis.imageUrl} alt="Issue" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                            )}
                                            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-primary">
                                                {analysis.issueType.replace('_', ' ').toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center">
                                                <MapPin className="h-4 w-4 mr-1.5" /> Incident Location
                                            </h4>
                                            <p className="text-foreground font-medium bg-secondary/20 p-3 rounded-lg border border-border/30">
                                                {address || (coords ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` : "Location not marked")}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Required sections */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center">
                                            <span className="bg-primary/20 text-primary w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 text-xs">AI</span>
                                            Detailed Problem (AI Detected)
                                        </label>
                                        <div className="p-5 rounded-xl bg-secondary/30 border border-primary/20 text-foreground whitespace-pre-wrap font-medium leading-relaxed">
                                            {analysis.description || "No detailed description was provided by the AI."}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                                            <label className="text-[15px] font-extrabold text-foreground leading-snug">
                                                Describe in under 400 words for writing an application of the problem to the authorities:
                                            </label>
                                            <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold ${wordCount > 400 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                                {wordCount} / 400 words
                                            </span>
                                        </div>
                                        <Textarea
                                            placeholder="To the Municipal Authorities...&#10;&#10;I am writing to report the severe condition of..."
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="min-h-[220px] bg-background border-border/60 hover:border-primary/50 focus:border-primary transition-colors text-base resize-y p-4"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting || wordCount > 400 || wordCount === 0 || (!address && !coords)}
                                        className="w-full h-14 gradient-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-all shadow-glow mt-2"
                                    >
                                        {submitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <FileText className="mr-2 h-6 w-6" />}
                                        {submitting ? 'Submitting Application...' : 'Submit Complaint'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 20 }}>
                            <Card className="glass-panel border-emerald-500/30 shadow-glow shadow-emerald-500/10 overflow-hidden">
                                <div className="bg-emerald-500 p-8 text-white text-center">
                                    <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                        <CheckCircle className="h-12 w-12 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Submission Successful</h2>
                                    <p className="text-emerald-50/80 font-bold mt-2">Your complaint has been synchronized with the Command Centre.</p>
                                </div>
                                <CardContent className="p-8 space-y-8">
                                    <div className="bg-secondary/20 p-6 rounded-2xl border border-border/40 space-y-4">
                                        <div className="flex justify-between items-center border-b border-border/40 pb-4">
                                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Reference ID</span>
                                            <span className="text-lg font-black text-primary font-mono bg-primary/5 px-3 py-1 rounded-lg">{submittedData.ref}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] mb-1">Incident Type</p>
                                                <p className="capitalize">{analysis.issueType.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground uppercase text-[10px] mb-1">Timestamp</p>
                                                <p>{new Date().toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Button asChild className="h-14 font-black shadow-lg">
                                            <a 
                                                href={`${getBaseUrl()}${submittedData.slipPdf}`} 
                                                download 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                Download PDF Slip
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" className="h-14 font-black border-emerald-500/20 hover:bg-emerald-500/5">
                                            <a 
                                                href={`${getBaseUrl()}${submittedData.slipJpg}`} 
                                                download 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                            >
                                                Download JPG Slip
                                            </a>
                                        </Button>
                                    </div>

                                    <Button variant="ghost" className="w-full font-bold h-12" onClick={() => navigate('/dashboard')}>
                                        Return to Dashboard
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
