import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Camera, MapPin, Zap, CheckCircle, BarChart3, ArrowRight, Sparkles, Building2, Trash2, ChevronLeft, ChevronRight, Eye, GitMerge, Activity, LogIn } from 'lucide-react';
import Navbar from '@/components/Navbar';

const features = [
  { icon: Camera, title: 'AI Vision Detection', desc: 'Upload a photo and our AI instantly identifies potholes, garbage, drains & road damage with precision', gradient: 'from-primary/20 to-primary/5' },
  { icon: MapPin, title: 'GPS Pinpointing', desc: 'Automatic GPS detection marks the exact location on an interactive heatmap', gradient: 'from-accent/20 to-accent/5' },
  { icon: Zap, title: 'Instant Routing', desc: 'Smart assignment routes issues to the nearest resolver for rapid action', gradient: 'from-warning/20 to-warning/5' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Real-time dashboards with KPIs, heatmaps, and AI-verified resolution tracking', gradient: 'from-success/20 to-success/5' },
];

const stats = [
  { value: '10K+', label: 'Issues Resolved' },
  { value: '98%', label: 'AI Accuracy' },
  { value: '<2hr', label: 'Avg Response' },
  { value: '50+', label: 'Cities Active' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const slides = [
  {
    image: '/carousel/slide-recycling.png',
    useImage: true,
    overlayColor: 'bg-gradient-to-t from-green-950/90 via-black/40 to-transparent',
    title: 'Waste Management',
    subtitle: 'CLEANER CITIES — CIVICDRISHTI BHARAT',
    subtitleColor: 'text-emerald-400 bg-emerald-400/20 border-emerald-400/40',
    showCard: true,
    bg: ''
  },
  {
    image: '/carousel/slide-pothole.png',
    useImage: true,
    overlayColor: 'bg-gradient-to-t from-orange-950/90 via-black/40 to-transparent',
    title: 'Road Repair Response',
    subtitle: 'RAPID FIELD ACTION — CIVICDRISHTI BHARAT',
    subtitleColor: 'text-orange-400 bg-orange-400/20 border-orange-400/40',
    showCard: false,
    bg: ''
  },
  {
    image: '/carousel/slide-drainage.png',
    useImage: true,
    overlayColor: 'bg-gradient-to-t from-blue-950/90 via-black/40 to-transparent',
    title: 'Water & Drainage',
    subtitle: 'WATERLOGGING RESOLVED — CIVICDRISHTI BHARAT',
    subtitleColor: 'text-blue-400 bg-blue-400/20 border-blue-400/40',
    showCard: false,
    bg: ''
  },
  {
    image: '/carousel/slide-streetlight.png',
    useImage: true,
    overlayColor: 'bg-gradient-to-t from-purple-950/90 via-black/40 to-transparent',
    title: 'Smart Street Lighting',
    subtitle: 'INFRASTRUCTURE MONITORING — CIVICDRISHTI BHARAT',
    subtitleColor: 'text-purple-400 bg-purple-400/20 border-purple-400/40',
    showCard: false,
    bg: ''
  },
];

export default function Index() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      <Navbar />

      {/* Official State Emblem Banner */}
      <div className="w-full bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-y-2 border-red-500/50 py-2 sm:py-3 overflow-hidden relative shadow-lg z-30">
        <div className="container max-w-7xl mx-auto px-3 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5 z-10 w-full">
            
            {/* Ashoka Lion Emblem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="shrink-0 bg-white flex items-center justify-center h-10 w-10 sm:h-14 sm:w-14 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] border-2 border-amber-500 p-1 z-20"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="Satyameva Jayate"
                className="h-full w-full object-contain"
              />
            </motion.div>

            {/* Animated Marquee Text */}
            <div className="flex-1 overflow-hidden relative flex items-center h-full [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
                className="flex whitespace-nowrap items-center text-white font-bold tracking-wider text-[11px] sm:text-[14px] uppercase"
              >
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="flex items-center gap-4 sm:gap-8 mx-4 sm:mx-6">
                    <span className="flex items-center gap-2 text-amber-300 drop-shadow-md">
                      <Shield className="h-4 w-4 shrink-0" /> SMART MUNICIPAL GOVERNANCE
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70"></span>
                    <span className="flex items-center gap-2 text-blue-200 drop-shadow-md">
                      <Building2 className="h-4 w-4 shrink-0" /> AI CIVIC REPORTING
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70"></span>
                    <span className="flex items-center gap-2 text-emerald-200 drop-shadow-md">
                      <Trash2 className="h-4 w-4 shrink-0" /> RAPID CITY RESOLUTION
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70"></span>
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Carousel Section */}
      <section className="relative pt-6 sm:pt-10 pb-12 sm:pb-20 bg-background">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4">
          <div className="relative group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative aspect-[16/11] sm:aspect-[16/8] lg:aspect-[21/9] min-h-[340px] sm:min-h-[420px] w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-white/10"
              >
                {/* Slide image background */}
                {slides[currentSlide].useImage && slides[currentSlide].image && (
                  <>
                    <motion.img
                      key={slides[currentSlide].image}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 6, ease: "linear" }}
                      src={slides[currentSlide].image}
                      alt="Slide Background"
                      className="h-full w-full object-cover"
                    />
                    <div className={`absolute inset-0 ${slides[currentSlide].overlayColor || 'bg-gradient-to-t from-black/85 via-black/30 to-transparent'} z-10`} />
                  </>
                )}

                {/* Subtitle & Title overlay */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 lg:bottom-12 lg:left-12 z-20 max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`mb-2 sm:mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-black tracking-widest uppercase ${slides[currentSlide].subtitleColor}`}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span>{slides[currentSlide].subtitle}</span>
                  </motion.div>

                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-2xl mb-3 sm:mb-4">
                    {slides[currentSlide].title}
                  </h1>

                  {/* Action Buttons for Mobile & Desktop */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-1">
                    <Button
                      size="sm"
                      onClick={() => navigate('/register')}
                      className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black uppercase text-xs sm:text-sm tracking-wider shadow-lg hover:shadow-glow transition-all"
                    >
                      Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/login')}
                      className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all"
                    >
                      <LogIn className="mr-1.5 h-4 w-4" /> Sign In
                    </Button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="mt-5 sm:mt-8 flex justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Go to slide ${idx + 1}`}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 transition-all duration-500 rounded-full ${currentSlide === idx ? 'w-8 sm:w-10 bg-primary shadow-glow-sm' : 'w-2 bg-primary/20 hover:bg-primary/40'}`}
                />
              ))}
            </div>
            
            {/* Side Controls (Floating) */}
            <div className="hidden sm:block absolute top-1/2 -left-5 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)} className="h-11 w-11 rounded-full glass border-white/10 text-white hover:bg-white/10 shadow-xl">
                 <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>
            <div className="hidden sm:block absolute top-1/2 -right-5 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)} className="h-11 w-11 rounded-full glass border-white/10 text-white hover:bg-white/10 shadow-xl">
                 <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Command Centre Quick Card */}
      <section className="container max-w-4xl mx-auto px-3 sm:px-4 mb-16 sm:mb-20 relative z-30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="glass-strong border-white/10 shadow-2xl p-4 sm:p-7 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem]">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-xl sm:text-2xl tracking-tight">CDB Command Centre</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Autonomous Governance Hub</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full md:w-auto justify-center text-center">
                {[
                  { label: "AI Vision", value: "Active", color: "text-emerald-500" },
                  { label: "Pan-Bharat", value: "Coverage", color: "text-blue-500" },
                  { label: "Uptime", value: "99.98%", color: "text-amber-500" }
                ].map((item, idx) => (
                  <div key={idx} className="px-2 sm:px-4 border-r border-border/40 last:border-0">
                    <p className={`text-base sm:text-lg font-black uppercase ${item.color}`}>{item.value}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/register')} className="w-full md:w-auto gradient-primary text-white font-black uppercase tracking-wider px-6 rounded-xl h-11 text-xs">
                Join Platform
              </Button>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4"
          >
            {stats.map(s => (
              <motion.div key={s.label} variants={itemVariants} className="text-center p-3 rounded-xl bg-background/50 border border-border/40">
                <p className="text-2xl sm:text-3xl font-extrabold text-gradient-primary">{s.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-16 text-center"
          >
            <h2 className="mb-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground">
              How <span className="text-gradient-primary">CivicDrishti Bharat</span> Works
            </h2>
            <p className="mx-auto max-w-2xl text-xs sm:text-sm text-muted-foreground">
              End-to-end civic issue management powered by AI vision, GPS tracking, and real-time analytics
            </p>
          </motion.div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="group h-full border-2 border-primary/10 bg-card/60 backdrop-blur-sm shadow-card transition-all duration-300 hover:shadow-glow hover:border-primary/30">
                  <CardContent className="p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <div className={`shrink-0 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} shadow-sm border border-primary/20`}>
                      <f.icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1.5 text-lg sm:text-xl font-bold text-foreground">{f.title}</h3>
                      <p className="text-xs sm:text-[14px] leading-relaxed text-muted-foreground">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center mt-auto bg-card/50">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground text-sm sm:text-base">CivicDrishti Bharat</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 CivicDrishti Bharat — Smart Civic Issue Detection & Governance Platform</p>
        </div>
      </footer>
    </div>
  );
}
