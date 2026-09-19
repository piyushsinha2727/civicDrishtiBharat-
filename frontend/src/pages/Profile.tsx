import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User as UserIcon, Mail, Phone, Lock, Save, Camera, ShieldCheck, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
    const { user, updateUser } = useAuth();

    // Profile State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '+91 ',
        avatar: user?.avatar || ''
    });

    // Security State
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingSecurity, setSavingSecurity] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                phone: user.phone || '+91 ',
                avatar: user.avatar || ''
            });
        }
    }, [user]);

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
                    <div className="bg-destructive/10 p-4 rounded-full inline-block">
                        <UserIcon className="h-12 w-12 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Access Denied</h2>
                    <Button onClick={() => window.location.href = '/login'} className="gradient-primary">Go to Login</Button>
                </motion.div>
            </div>
        );
    }

    const handlePhoneChange = (val: string) => {
        if (!val.startsWith('+91 ')) {
            setFormData({ ...formData, phone: '+91 ' });
        } else {
            const numeric = val.slice(4).replace(/\D/g, '');
            if (numeric.length <= 10) {
                setFormData({ ...formData, phone: '+91 ' + numeric });
            }
        }
    };

    const handleProfileSave = async () => {
        try {
            setSavingProfile(true);
            const response = await fetch(getApiUrl('/auth/profile'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user._id || user.id, ...formData })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update profile');
            updateUser(data.user);
            toast.success('Your profile details have been updated successfully!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSecuritySave = async () => {
        try {
            if (!passwords.oldPassword) {
                toast.error('Old password is required.');
                return;
            }
            if (passwords.newPassword !== passwords.confirmPassword) {
                toast.error('New passwords do not match!');
                return;
            }
            if (passwords.newPassword.length < 6) {
                toast.error('New password must be at least 6 characters.');
                return;
            }

            setSavingSecurity(true);
            const response = await fetch(getApiUrl('/auth/profile'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user._id || user.id,
                    oldPassword: passwords.oldPassword,
                    password: passwords.newPassword
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update security settings');

            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordChange(false);
            toast.success('Your password has been changed successfully!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingSecurity(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col pb-12 font-sans">
            <Navbar />

            <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
                {/* Profile Hero */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12">
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-2xl ring-4 ring-background">
                            <AvatarImage src={formData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=800000`} alt={user.name} />
                            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-black">
                                {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-xl shadow-lg border-2 border-background">
                            <Camera className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase mb-1">{user.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                            <Badge variant="outline" className="border-primary/40 text-primary font-black px-2 py-0.5 bg-primary/5 uppercase tracking-widest text-[10px]">
                                {user.role}
                            </Badge>
                            <span className="text-muted-foreground font-bold text-sm flex items-center gap-1.5"><Mail className="h-4 w-4 text-primary/40" /> {user.email}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <Card className="glass-panel border-border/50 shadow-elevated overflow-hidden">
                        <CardHeader className="bg-secondary/20 pb-5 border-b border-border/50">
                            <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight">
                                <UserIcon className="h-6 w-6 text-primary" /> Profile Identity
                            </CardTitle>
                            <CardDescription className="text-sm font-bold text-muted-foreground/70 tracking-tight">Manage your legal name and contact reachability</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-foreground font-black uppercase text-xs tracking-widest">Full Legal Name</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 bg-secondary/30 font-bold text-base border-border/40" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-foreground font-black uppercase text-xs tracking-widest">Primary Email</Label>
                                    <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-12 bg-secondary/30 font-bold text-base border-border/40" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-foreground font-black uppercase text-xs tracking-widest">Contact Phone</Label>
                                    <Input value={formData.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="+91 XXXXX XXXXX" className="h-12 bg-secondary/30 font-bold text-base border-border/40" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-foreground font-black uppercase text-xs tracking-widest">Avatar URL</Label>
                                    <Input value={formData.avatar} onChange={(e) => setFormData({ ...formData, avatar: e.target.value })} placeholder="Image URL..." className="h-12 bg-secondary/30 font-bold text-base border-border/40" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-secondary/10 border-t border-border/50 p-6 flex justify-end">
                            <Button onClick={handleProfileSave} disabled={savingProfile} className="gradient-primary px-10 h-12 font-black uppercase tracking-widest text-xs shadow-glow">
                                {savingProfile ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="glass-panel border-border/50 shadow-elevated overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-5 border-b border-border/50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tight">
                                        <ShieldCheck className="h-6 w-6 text-primary" /> Privacy Control
                                    </CardTitle>
                                    <CardDescription className="text-sm font-bold text-muted-foreground/70">Manage data collection and account credentials</CardDescription>
                                </div>
                                <Button
                                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                                    variant="outline"
                                    className={`h-10 px-4 font-black uppercase text-[10px] tracking-widest transition-all ${showPasswordChange ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/30 text-primary hover:bg-primary/10'}`}
                                >
                                    <Lock className="h-3.5 w-3.5 mr-2" />
                                    {showPasswordChange ? 'Cancel Change' : 'Change Password'}
                                    {showPasswordChange ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <AnimatePresence>
                                {showPasswordChange && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-primary/5 border-b border-border/50">
                                        <div className="p-8 grid md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-foreground font-black uppercase text-[10px] tracking-widest">Old Password</Label>
                                                <div className="relative">
                                                    <Input type={showOldPass ? "text" : "password"} value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} className="h-11 bg-background font-bold border-border/40 pr-10" />
                                                    <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                                                        {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-foreground font-black uppercase text-[10px] tracking-widest">New Password</Label>
                                                <div className="relative">
                                                    <Input type={showNewPass ? "text" : "password"} value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="h-11 bg-background font-bold border-border/40 pr-10" />
                                                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                                                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-foreground font-black uppercase text-[10px] tracking-widest">Confirm New</Label>
                                                <div className="relative">
                                                    <Input type={showConfirmPass ? "text" : "password"} value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="h-11 bg-background font-bold border-border/40 pr-10" />
                                                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                                                        {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="md:col-span-3 flex justify-between items-center gap-6 pt-2">
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] font-bold text-destructive leading-tight flex-1 max-w-lg">
                                                    <AlertCircle className="h-4 w-4 shrink-0" /> Password updates require old password verification and will logout other sessions.
                                                </div>
                                                <Button onClick={handleSecuritySave} disabled={savingSecurity || !passwords.newPassword} className="h-11 px-8 font-black uppercase tracking-widest text-xs bg-destructive hover:bg-destructive/90 text-white shadow-md">
                                                    {savingSecurity ? 'Processing...' : 'Verify & Change'}
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="p-8 flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                    <ShieldCheck className="h-7 w-7 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-black text-foreground uppercase text-base tracking-tight mb-1">Identity Secured</h4>
                                    <p className="text-xs text-muted-foreground font-bold leading-relaxed max-w-2xl">Your registered phone and email are encrypted and visible only to verifying officers when you file a report.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
