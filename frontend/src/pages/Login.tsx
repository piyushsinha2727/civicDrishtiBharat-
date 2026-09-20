import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { 
  Loader2, Shield, ArrowRight, ShieldAlert, FileText, 
  Download, RotateCcw, Send, CheckCircle, Clock, XCircle, Camera, AlertTriangle 
} from 'lucide-react';

const getDashboardForRole = (role: string | null) => {
  if (role === 'admin') return '/admin';
  if (role === 'resolver') return '/resolver';
  return '/dashboard';
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [loading, setLoading] = useState(false);
  
  // Track suspension state for showing a dedicated report UI
  const [suspendedError, setSuspendedError] = useState<string | null>(null);
  const [suspendedData, setSuspendedData] = useState<any | null>(null);
  
  // Suspension Appeal State
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealStatement, setAppealStatement] = useState('');
  const [appealDocument, setAppealDocument] = useState<string | null>(null);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [step, timeLeft]);

  useEffect(() => {
    if (user && user.role) navigate(getDashboardForRole(user.role));
  }, [user, navigate]);

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await login(email, password, undefined);
      if (res && res.requireOtp) {
        toast.success('A fresh OTP has been sent to your email');
        setTimeLeft(300);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setSuspendedError(null);
      setSuspendedData(null);
      const res = await login(email, password, step === 'otp' ? otp : undefined);

      if (res && res.requireOtp) {
        toast.success(res.message || 'OTP sent to email');
        setStep('otp');
        return;
      }

      toast.success('Logged in successfully');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      navigate(getDashboardForRole(storedUser.role || 'citizen'));
    } catch (err: any) {
      if (err.data && (err.data.is_suspended || err.data.suspension_letter)) {
        setSuspendedData(err.data);
        setSuspendedError(err.message || 'Account Suspended');
      } else if (err.message && (err.message.includes('Account Suspended') || err.message.includes('suspended'))) {
        setSuspendedError(err.message);
      } else {
        toast.error(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitSuspensionAppeal = async () => {
    if (!appealStatement.trim()) return toast.error("Please provide an appeal explanation statement");
    if (!suspendedData?.engineer_id) return toast.error("Engineer profile ID missing");

    setSubmittingAppeal(true);
    try {
      const res = await fetch(getApiUrl('/engineers/suspension/appeal'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineer_id: suspendedData.engineer_id,
          statement: appealStatement,
          supporting_document: appealDocument
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit appeal");

      toast.success("Formal appeal submitted successfully to Admin!");
      setSuspendedData({
        ...suspendedData,
        suspension_appeal: {
          submitted: true,
          status: 'Pending',
          statement: appealStatement,
          submitted_at: new Date()
        }
      });
      setShowAppealForm(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative flex items-center justify-center py-16 min-h-[calc(100vh-64px)] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-right bg-no-repeat opacity-[0.25] dark:opacity-[0.25]"
          style={{ backgroundImage: "url('/map-bg.png')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(160_84%_39%/0.15),transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-lg px-4"
        >
          <Card className="border-border/30 shadow-elevated glass-strong overflow-hidden">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
                <Shield className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-foreground">Welcome Back</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your CivicDrishti Bharat account</p>
            </CardHeader>
            <CardContent>
              
              {/* --- OFFICIAL SUSPENSION NOTICE & REPORT DOWNLOAD CARD --- */}
              {suspendedError && (
                <div className="mb-6 p-5 rounded-2xl border-2 border-destructive bg-destructive/10 shadow-glow-destructive backdrop-blur-md space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                      <ShieldAlert className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-destructive uppercase tracking-wider">Disciplinary Action In Effect</p>
                      <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">Account Login Suspended</h3>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-black/20 p-3 rounded-xl border border-destructive/20">
                    {suspendedError.replace('⛔ ', '')}
                  </p>

                  {/* Suspended Until Date */}
                  {suspendedData?.suspension_until && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-xs">
                      <span className="font-bold text-destructive flex items-center gap-1.5 uppercase text-[10px]">
                        <Clock className="h-3.5 w-3.5" /> Suspended Until:
                      </span>
                      <span className="font-black text-foreground">
                        {new Date(suspendedData.suspension_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* DOWNLOAD OFFICIAL DISCIPLINARY REPORTS */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Official Disciplinary Records</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {suspendedData?.suspension_letter ? (
                        <Button
                          size="sm"
                          className="h-11 bg-destructive hover:bg-destructive/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
                          onClick={() => {
                            window.open(`${getBaseUrl()}${suspendedData.suspension_letter}`, '_blank');
                          }}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span>Download Order (PDF)</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="h-11 border-destructive/30 text-destructive/60 font-bold text-[10px] uppercase"
                        >
                          <FileText className="h-4 w-4 mr-1" /> PDF Order Processing
                        </Button>
                      )}

                      {suspendedData?.disciplinary_notice_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 border-destructive/40 text-destructive hover:bg-destructive/15 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2"
                          onClick={() => {
                            window.open(`${getBaseUrl()}${suspendedData.disciplinary_notice_url}`, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4 shrink-0" />
                          <span>View Notice (JPG)</span>
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center p-2 text-[10px] font-bold text-muted-foreground border border-border/30 rounded-lg">
                          Admin Order Registered
                        </div>
                      )}
                    </div>
                  </div>

                  {/* APPEAL SECTION */}
                  <div className="border-t border-destructive/20 pt-3">
                    {suspendedData?.suspension_appeal?.submitted ? (
                      <div className={`p-3 rounded-xl border ${
                        suspendedData.suspension_appeal.status === 'Approved'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : suspendedData.suspension_appeal.status === 'Rejected'
                          ? 'bg-destructive/10 border-destructive/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {suspendedData.suspension_appeal.status === 'Approved' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                          {suspendedData.suspension_appeal.status === 'Rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                          {suspendedData.suspension_appeal.status === 'Pending' && <Clock className="h-4 w-4 text-amber-500 animate-pulse" />}
                          <span className={`text-[11px] font-black uppercase tracking-wider ${
                            suspendedData.suspension_appeal.status === 'Approved' ? 'text-emerald-500'
                            : suspendedData.suspension_appeal.status === 'Rejected' ? 'text-destructive'
                            : 'text-amber-500'
                          }`}>
                            Appeal {suspendedData.suspension_appeal.status}
                          </span>
                        </div>
                        {suspendedData.suspension_appeal.status === 'Pending' && (
                          <p className="text-[11px] text-muted-foreground font-medium">Your appeal is under active review by the municipal command center.</p>
                        )}
                        {suspendedData.suspension_appeal.status === 'Rejected' && (
                          <p className="text-[11px] text-destructive font-medium">Appeal was rejected. Suspension remains in effect.</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        {!showAppealForm ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowAppealForm(true)}
                            className="w-full h-10 font-black text-xs uppercase tracking-wider gap-2 text-amber-500 border border-amber-500/30 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Appeal for Suspension Withdrawal
                          </Button>
                        ) : (
                          <div className="space-y-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" /> Submit Appeal Statement
                              </span>
                              <button 
                                onClick={() => setShowAppealForm(false)} 
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                            <textarea
                              value={appealStatement}
                              onChange={(e) => setAppealStatement(e.target.value)}
                              placeholder="Explain why this suspension should be reconsidered with any evidence..."
                              className="w-full h-20 bg-background border border-amber-500/30 rounded-lg p-2.5 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                            />
                            
                            {/* Document attachment */}
                            <label className="flex h-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-all gap-2 text-[10px] font-bold text-amber-600">
                              <Camera className="h-4 w-4" />
                              <span>{appealDocument ? "Proof Document Attached ✓" : "Attach Proof / Evidence (Optional)"}</span>
                              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setAppealDocument(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }} />
                            </label>

                            <Button
                              size="sm"
                              onClick={submitSuspensionAppeal}
                              disabled={submittingAppeal || !appealStatement.trim()}
                              className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider"
                            >
                              {submittingAppeal ? (
                                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Transmitting Appeal...</span>
                              ) : (
                                <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Transmit Formal Appeal</span>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 'login' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                      <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors" />
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="text-center mb-4">
                      <Label className="text-muted-foreground text-sm">Enter the 6-digit code sent to <b className="text-foreground">{email}</b></Label>
                    </div>
                    <Input autoFocus id="otp" type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required placeholder="123456" className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors" />
                    <div className="flex items-center justify-between text-sm mt-3 px-1">
                      <span className="text-muted-foreground font-medium">OTP expires in: <span className={timeLeft > 60 ? "text-primary" : "text-destructive"}>{formatTime(timeLeft)}</span></span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={timeLeft > 0 || loading}
                        className={`font-bold transition-colors ${timeLeft > 0 ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-primary hover:text-blue-500 underline underline-offset-2'}`}
                      >
                        Resend Code
                      </button>
                    </div>
                  </motion.div>
                )}
                <Button type="submit" className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all duration-300 hover:shadow-glow group" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {step === 'login' ? 'Sign In' : 'Verify Code'}
                  {!loading && step === 'login' && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                  Create Account
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}