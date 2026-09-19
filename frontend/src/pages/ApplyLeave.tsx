import { useState } from 'react';
import { getApiUrl } from '@/lib/api';
import { motion } from 'framer-motion';
import { Calendar, FileText, Upload, Send, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ApplyLeave() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    duration_from: '',
    duration_to: '',
    proof_document: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, proof_document: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.duration_from || !formData.duration_to) {
      return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/leave/apply'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineer_id: user?._id || user?.id,
          ...formData
        })
      });

      if (!res.ok) throw new Error("Failed to submit application");

      toast.success("Leave application submitted successfully!");
      navigate('/leave/status');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
        <DashboardSidebar />
        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2 font-bold uppercase text-xs">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-8 border-primary/20 bg-secondary/10 backdrop-blur-sm shadow-elevated">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Apply for Leave</h1>
                    <p className="text-muted-foreground text-sm font-bold">Submit your absence request for approval</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">From Date</label>
                      <Input 
                        type="date" 
                        required
                        className="bg-background/50 border-border/50 h-12 font-bold"
                        value={formData.duration_from}
                        onChange={(e) => setFormData({ ...formData, duration_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">To Date</label>
                      <Input 
                        type="date" 
                        required
                        className="bg-background/50 border-border/50 h-12 font-bold"
                        value={formData.duration_to}
                        onChange={(e) => setFormData({ ...formData, duration_to: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Reason for Leave</label>
                    <Textarea 
                      placeholder="Briefly explain the reason for your absence..."
                      className="min-h-[120px] bg-background/50 border-border/50 rounded-xl p-4 font-medium"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Proof Document (Optional)</label>
                    <div className="relative h-32 w-full border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-all">
                      <Upload className="h-8 w-8 text-primary/60 mb-2" />
                      <span className="text-xs font-black uppercase text-primary/60">Upload Medical/Official Proof</span>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                      {formData.proof_document && <p className="text-[10px] text-success font-bold mt-2">File Attached ✓</p>}
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full h-14 gradient-primary shadow-glow font-black uppercase tracking-widest text-white">
                    {loading ? 'Transmitting Request...' : 'Submit Application'}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
