import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, MapPin, Search, AlertCircle, CheckCircle, Clock, Map, Sparkles, Navigation, FileText, ArrowRight, Star, ThumbsUp, ThumbsDown, Camera, Brain, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import DashboardSidebar from '@/components/DashboardSidebar';
import ImageAnalyzer from '@/components/ImageAnalyzer';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import heroImage from '@/assets/hero-city.jpg';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition, onLocationChange }: { position: any, setPosition: any, onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tracking State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [citizenRating, setCitizenRating] = useState(0);
  const [citizenFeedback, setCitizenFeedback] = useState('');
  const [satisfactionSelected, setSatisfactionSelected] = useState<'satisfied' | 'dissatisfied' | null>(null);

  // Submission Success State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [submittedRef, setSubmittedRef] = useState('');

  useEffect(() => {
    if (user) fetchComplaints();
  }, [user]);

  const fetchComplaints = async () => {
    try {
      const res = await fetch(getApiUrl(`/complaints?user_id=${user?._id || user?.id}`));
      const data = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const main = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || "";
        const city = addr.city || addr.town || addr.village || addr.county || "";
        const state = addr.state || "";
        const display = [main, city, state].filter(Boolean).join(", ");
        setAddress(display || data.display_name);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
  };

  const captureLocation = () => {
    if ("geolocation" in navigator) {
      toast.info("Fetching high-precision coordinates...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          console.log(`GPS Location Captured: ${lat}, ${lng} (Accuracy: ${accuracy}m)`);
          setLocation({ lat, lng });
          reverseGeocode(lat, lng);
          toast.success(`Location locked (±${Math.round(accuracy)}m)`);
        },
        (err) => {
          console.error("Geolocation Error:", err);
          if (err.code === 1) toast.error("Location permission denied.");
          else if (err.code === 3) toast.error("GPS Timeout. Using fallback...");
          else toast.error("Could not fetch precise location.");
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    } else {
      toast.error("Geolocation not supported by your browser.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) return toast.error("Please analyze an image first");
    if (!address && !location) return toast.error("Please provide a location");

    setSubmitting(true);
    try {
      const payload = {
        user_email: user?.email,
        issue_type: analysis.issueType,
        description: description || analysis.description,
        latitude: location?.lat,
        longitude: location?.lng,
        address,
        image_url: analysis.imageBase64,
      };

      const res = await fetch(getApiUrl('/complaints'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSubmittedRef(data.ref);
      setSuccessModalOpen(true);

      // Reset
      setAnalysis(null);
      setDescription('');
      setAddress('');
      setLocation(null);
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFeedback = async (satisfied: boolean) => {
    try {
      const res = await fetch(getApiUrl('/complaints/feedback'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          complaint_id: selectedTrack._id || selectedTrack.id, 
          satisfied, 
          rating: citizenRating,
          feedback: citizenFeedback
        })
      });
      if (!res.ok) throw new Error("Feedback submission failed");
      toast.success(satisfied ? "Thank you for your feedback!" : "Feedback recorded. Redressal initiated.");
      setTrackModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!window.confirm(`Are you sure you want to withdraw and delete complaint ${ref}?`)) return;
    
    try {
      const res = await fetch(getApiUrl(`/complaints/${id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Complaint withdrawn successfully");
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Forwarded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Assigned': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'In Progress': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Resolved': return 'bg-emerald-500 text-white border-primary/20 shadow-glow';
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

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden w-full max-w-[1400px] mx-auto">
        <DashboardSidebar />
        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-y-auto hide-scrollbar">

          {/* Attactive Hero Banner inside Dashboard */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-elevated h-[200px] lg:h-[240px] flex items-center group">
            <img src={heroImage} alt="City Skyline" className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent/10 pointer-events-none" />
            <div className="relative z-10 px-6 lg:px-10 w-full max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 mb-5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Real-World AI Enabled
                </div>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground/95 mb-4 drop-shadow-sm">
                  Citizen <span className="text-gradient-primary font-black drop-shadow-sm">Command Center</span>
                </h1>
                <p className="text-base lg:text-lg text-foreground/80 font-bold leading-relaxed max-w-xl drop-shadow-sm">
                  Upload photos of civic issues. Our Vision AI accurately detects, classifies, and filters irrelevant images instantly for rapid city resolution.
                </p>
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 items-start">

            {/* CASE 1: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                {/* Stats Cards - inside Dashboard section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="glass-panel border-border/50 shadow-elevated">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
                      <CardTitle className="text-sm font-bold tracking-wider uppercase">Sent Applications</CardTitle>
                      <FileText className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-foreground">{complaints.length}</div>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Total submitted</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel border-border/50 shadow-elevated">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
                      <CardTitle className="text-sm font-bold tracking-wider uppercase">Active Complaints</CardTitle>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-foreground">
                        {complaints.filter((c: any) => ['New', 'In Progress', 'Assigned', 'Forwarded'].includes(c.status)).length}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Currently being processed</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel border-border/50 shadow-elevated">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
                      <CardTitle className="text-sm font-bold tracking-wider uppercase">Complaints Reviewed</CardTitle>
                      <Search className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-foreground">
                        {complaints.filter((c: any) => ['Forwarded', 'Assigned', 'In Progress', 'Resolved', 'Closed'].includes(c.status)).length}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Acknowledged by officials</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-panel border-border/50 shadow-elevated">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-muted-foreground">
                      <CardTitle className="text-sm font-bold tracking-wider uppercase">Issues Resolved</CardTitle>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-foreground">
                        {complaints.filter((c: any) => c.status === 'Resolved' || c.status === 'Closed').length}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Successfully completed</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-black flex items-center gap-2 mb-2">
                    <Clock className="h-6 w-6 text-primary" /> Application History
                  </h2>
                  {loading ? (
                    <div className="flex items-center justify-center p-12 text-muted-foreground">Loading history...</div>
                  ) : complaints.length === 0 ? (
                    <Card className="glass-panel border-dashed p-12 text-center text-muted-foreground font-semibold">
                      You haven't submitted any civic issue reports yet.
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {complaints.map((c) => (
                        <motion.div key={c.id || c._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                          <Card className="glass-panel overflow-hidden border-border/40 shadow-card hover:border-primary/30 transition-shadow">
                            <div className="p-5 flex gap-5">
                              <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-border/50">
                                <SafeImage src={c.before_image} alt="Issue" className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-foreground uppercase truncate">{c.issue_type.replace('_', ' ')}</h3>
                                  <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 mb-2 line-clamp-1">{c.address}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/70 uppercase">
                                      <span>Ref: {c.reference_number}</span>
                                      <span>•</span>
                                      <span className="text-primary">{c.predicted_days} Days Est.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {c.status === 'New' && (
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={(e) => { e.stopPropagation(); handleDelete(c._id || c.id, c.reference_number); }}
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive transition-colors"
                                          title="Withdraw Complaint"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => { setSelectedTrack(c); setTrackModalOpen(true); }}
                                        className="h-7 text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10 hover:text-primary transition-all px-2"
                                      >
                                        Track Status
                                      </Button>
                                    </div>
                                  </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CASE 2: REPORT PORTAL */}
            {activeTab === 'report' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT: SUBMIT FORM */}
                <div className={`transition-all duration-500 ${analysis ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
                  <Card className="glass-panel border-border/50 shadow-elevated">
                    <CardHeader className="border-b border-border/50 bg-secondary/20 pb-4 text-center">
                      <CardTitle className="inline-flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
                        <Upload className="h-6 w-6 text-primary" /> Report Interface
                      </CardTitle>
                      <CardDescription className="font-bold">Upload and analyze civic issues instantly</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <ImageAnalyzer onAnalysisComplete={setAnalysis} />
                      {analysis && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5 pt-4 border-t border-border/50">
                          <div className="space-y-1 bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <p className="text-sm font-bold text-primary flex items-center uppercase tracking-wide"><MapPin className="h-4 w-4 mr-2" /> Set Location</p>
                            <p className="text-xs text-muted-foreground/80 font-medium">Please pinpoint the issue on the map or use Auto-GPS.</p>
                          </div>
                          <Button onClick={() => navigate('/file-complaint', { state: { analysis, location, address } })} className="w-full h-14 gradient-primary text-primary-foreground font-black text-xl hover:opacity-90 transition-all shadow-glow mt-4 group">
                            File a Complaint <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1" />
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT: DYNAMIC (MAP or INFO) */}
                {analysis && (
                  <div className="lg:col-span-8 space-y-6">
                    <Card className="glass-panel border-border/50 shadow-elevated overflow-hidden">
                      <CardHeader className="bg-primary/10 border-b border-border/50 p-5">
                        <CardTitle className="text-xl font-black flex items-center gap-2 text-primary uppercase">
                          <Sparkles className="h-6 w-6" /> AI Analysis Report
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 flex items-center gap-6 text-foreground">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-success/20 shadow-inner">
                          <CheckCircle className="h-10 w-10 text-success" />
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-3">
                            <h2 className="text-3xl font-black uppercase leading-none">{analysis.issueType.replace('_', ' ')}</h2>
                            <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-xs">{(analysis.confidence * 100).toFixed(1)}% Confidence</Badge>
                          </div>
                          <p className="mt-3 text-base text-muted-foreground font-bold leading-relaxed">
                            {analysis.description}
                          </p>
                          {analysis.forensic_details && analysis.forensic_details.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {analysis.forensic_details.map((detail: string, i: number) => (
                                <Badge key={i} variant="outline" className="bg-success/5 text-success border-success/20 text-[10px] font-bold py-1 px-2">
                                  <Sparkles className="h-3 w-3 mr-1" /> {detail}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-panel border-border/50 shadow-elevated overflow-hidden flex flex-col h-[600px]">
                      <CardHeader className="bg-secondary/20 border-b border-border/50 shrink-0 p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase">
                              <MapPin className="h-6 w-6 text-primary" /> Pinpoint Location
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-bold">Drag or click to set coordinates</CardDescription>
                          </div>
                          <Button variant="outline" onClick={captureLocation} className="h-12 px-6 hover:bg-primary/10 hover:text-primary border-border/50 group font-bold">
                            <Navigation className="h-5 w-5 mr-2 group-hover:animate-bounce" /> Auto-GPS
                          </Button>
                        </div>
                      </CardHeader>
                      <div className="flex-1 relative z-0">
                        <MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                          <LocationMarker position={location} setPosition={setLocation} onLocationChange={reverseGeocode} />
                        </MapContainer>
                        <div className="absolute bottom-6 left-6 right-6 z-[400] bg-background/95 backdrop-blur-md p-5 rounded-2xl border border-border/50 shadow-2xl">
                          <div className="flex flex-col md:flex-row gap-4 items-center">
                            <Input placeholder="Manually type address..." value={address} onChange={e => setAddress(e.target.value)} className="flex-1 bg-secondary/50 h-12 font-bold" />
                            {location && <Badge className="h-12 px-5 text-sm font-black bg-primary/10 text-primary border-primary/20">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Badge>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* SUCCESS MODAL FOR REFERENCE NUMBER */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-[500px] glass-strong border-primary/20 shadow-elevated text-center py-10">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 shadow-glow">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tight text-foreground">Complaint Filed!</DialogTitle>
              <p className="text-muted-foreground font-bold mt-2">Your report has been successfully transmitted to the Urban Command Center.</p>
            </DialogHeader>
            
            <div className="mt-8 p-6 bg-secondary/50 rounded-2xl border border-border/50 w-full">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">Your Unique Reference Number</p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl font-black text-primary tracking-tighter">{submittedRef}</code>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(submittedRef); toast.success("Ref Copied!"); }} className="h-8 w-8 p-0">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-600 text-xs font-bold text-left">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>IMPORTANT: Store this reference number securely. It is required for all future correspondence and status tracking.</p>
            </div>

            <Button onClick={() => setSuccessModalOpen(false)} className="w-full h-12 mt-8 gradient-primary font-black uppercase tracking-widest text-primary-foreground shadow-glow">
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TRACKING & FEEDBACK DIALOG */}
      <Dialog open={trackModalOpen} onOpenChange={(open) => { setTrackModalOpen(open); if(!open) { setSatisfactionSelected(null); setCitizenRating(0); } }}>
        <DialogContent className="sm:max-w-[750px] glass-strong border-primary/20 shadow-elevated max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2 uppercase tracking-tight">
               <Navigation className="h-6 w-6 text-primary" /> Resolution Tracking
            </DialogTitle>
          </DialogHeader>

          {selectedTrack && (
            <div className="space-y-8 py-4">
               {/* IMAGE COMPARISON */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Camera className="h-3 w-3" /> Citizen Report Photo
                     </h4>
                     <div className="aspect-video rounded-2xl overflow-hidden border border-border/50 bg-secondary/20 shadow-inner group flex items-center justify-center">
                        {selectedTrack.before_image ? (
                           <img 
                              src={selectedTrack.before_image} 
                              alt="Before" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              onError={(e) => {
                                 // Hide broken image tag and show fallback
                                 (e.target as HTMLImageElement).style.display = 'none';
                                 const parent = (e.target as HTMLImageElement).parentElement;
                                 if (parent) {
                                    parent.innerHTML = `<div class="text-center p-6 grayscale opacity-40"><svg class="h-10 w-10 mx-auto mb-2 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg><p class="text-[10px] font-black uppercase">Report Image Preview</p></div>`;
                                 }
                              }}
                           />
                        ) : (
                           <div className="text-center p-6 grayscale opacity-40">
                              <Camera className="h-10 w-10 mx-auto mb-2" />
                              <p className="text-[10px] font-black uppercase">Original Image Lost</p>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" /> Engineer Resolution Photo
                     </h4>
                     <div className="aspect-video rounded-2xl overflow-hidden border border-emerald-500/20 bg-emerald-500/5 shadow-inner group flex items-center justify-center">
                        {selectedTrack.after_image ? (
                           <img src={selectedTrack.after_image} alt="After" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                           <div className="text-center p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30">
                              <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 opacity-50" />
                              <p className="text-xs font-bold text-muted-foreground">Work in progress by engineer</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* AI VERIFICATION STATUS */}
               {selectedTrack.resolution_analysis && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-black uppercase text-primary flex items-center gap-2">
                           <Brain className="h-5 w-5" /> AI Verification Report
                        </h4>
                        <Badge className={`${selectedTrack.resolution_analysis.is_false_image ? 'bg-destructive animate-bounce' : selectedTrack.resolution_analysis.is_resolved ? 'bg-emerald-500' : 'bg-orange-500'} text-white font-black px-4 py-1 text-xs shadow-glow flex items-center gap-1`}>
                           {selectedTrack.resolution_analysis.is_false_image ? <AlertTriangle className="h-3 w-3" /> : selectedTrack.resolution_analysis.is_resolved ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                           {selectedTrack.resolution_analysis.is_false_image ? 'FALSE IMAGE DETECTED' : selectedTrack.resolution_analysis.is_resolved ? 'MATCH VERIFIED' : 'STATE CONFLICT'}
                        </Badge>
                     </div>
                     <p className="text-sm font-bold text-foreground leading-relaxed italic border-l-4 border-primary/30 pl-4 py-2 bg-background/30 rounded-r-xl">
                        "{selectedTrack.resolution_analysis.analysis_text || selectedTrack.resolution_analysis.analysis}"
                     </p>
                     {selectedTrack.resolution_analysis.is_false_image && selectedTrack.resolution_analysis.detected_content && (
                        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                           <h5 className="text-[10px] font-black uppercase text-destructive tracking-widest mb-1">AI Detected Actual Content:</h5>
                           <p className="text-sm font-bold text-foreground">
                              {selectedTrack.resolution_analysis.detected_content}
                           </p>
                        </div>
                     )}
                  </motion.div>
               )}

               {/* CITIZEN FEEDBACK FORM */}
               {selectedTrack.status === 'Resolved' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6 border-t border-border/30 space-y-6">
                     <div className="text-center">
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Are you satisfied with this resolution?</h3>
                        <p className="text-sm text-muted-foreground font-medium">Click a response below to reveal the rating system.</p>
                     </div>

                     {/* SATISFACTION TOGGLES */}
                     <div className="grid grid-cols-2 gap-4">
                        <Button 
                            onClick={() => setSatisfactionSelected('dissatisfied')} 
                            variant="outline" 
                            className={`h-14 font-black uppercase tracking-wider transition-all ${satisfactionSelected === 'dissatisfied' ? 'bg-destructive text-white border-destructive shadow-glow-destructive' : 'border-destructive/30 text-destructive hover:bg-destructive/5'}`}
                        >
                            <ThumbsDown className="mr-2 h-5 w-5" /> 
                            No, it's False/Illegal Activity
                        </Button>
                        <Button 
                            onClick={() => setSatisfactionSelected('satisfied')} 
                            variant="outline"
                            className={`h-14 font-black uppercase tracking-wider transition-all ${satisfactionSelected === 'satisfied' ? 'bg-emerald-500 text-white border-emerald-500 shadow-glow' : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/5'}`}
                        >
                            <ThumbsUp className="mr-2 h-5 w-5" /> 
                            Yes, I'm Satisfied
                        </Button>
                     </div>

                     {/* CONDITIONAL RATING AND SUBMIT */}
                     <AnimatePresence>
                        {satisfactionSelected && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 pt-6 overflow-hidden">
                              <div className="text-center space-y-4">
                                 <h4 className="text-sm font-black uppercase text-muted-foreground tracking-widest">
                                    {satisfactionSelected === 'satisfied' ? '⭐ Rate our service excellence' : '⚠️ Rate the engineer\'s performance effort'}
                                 </h4>
                                 <div className="flex justify-center gap-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                       <button key={star} onClick={() => setCitizenRating(star)} className="focus:outline-none transform active:scale-90 transition-transform">
                                          <Star className={`h-10 w-10 ${citizenRating >= star ? (satisfactionSelected === 'satisfied' ? 'fill-yellow-400 text-yellow-400' : 'fill-destructive text-destructive') : 'text-muted-foreground/30'}`} />
                                       </button>
                                    ))}
                                 </div>
                              </div>

                              <div className="space-y-4">
                                 <textarea 
                                    placeholder={satisfactionSelected === 'satisfied' ? "What did you like about the resolution? (Optional)" : "Please specify why the resolution is incorrect or incomplete..."}
                                    value={citizenFeedback}
                                    onChange={(e) => setCitizenFeedback(e.target.value)}
                                    className="w-full h-24 bg-secondary/30 border border-border/50 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                                 />

                                 <Button 
                                    onClick={() => submitFeedback(satisfactionSelected === 'satisfied')} 
                                    disabled={citizenRating === 0}
                                    className={`w-full h-14 font-black uppercase tracking-widest text-white shadow-glow ${satisfactionSelected === 'satisfied' ? 'gradient-primary' : 'bg-destructive hover:bg-destructive/90'}`}
                                 >
                                    {satisfactionSelected === 'satisfied' ? 'Confirm and Close Complaint' : 'Report Dishonest/Illegal Activity'}
                                 </Button>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               )}

               {selectedTrack.status === 'Closed' && (
                  <div className="pt-6 border-t border-border/30 text-center">
                     <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-sm uppercase">
                        <CheckCircle className="h-5 w-5" /> CASE CLOSED & ARCHIVED
                     </div>
                  </div>
               )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
