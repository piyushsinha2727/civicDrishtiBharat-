import { useState } from 'react';
import { getApiUrl } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
  Map as MapIcon, AlertTriangle, 
  Layers, RefreshCw, 
  Shield, Info, X, Users, Activity, ExternalLink, Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import HeatmapMap from './HeatmapMap';

const TrendingUp = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

interface HeatmapPoint {
  id: string;
  type: string;
  coordinates: [number, number];
  severity: number;
  timestamp: string;
}

interface HeatmapZone {
  id: string;
  name: string;
  coords: [number, number];
  metrics: {
    rain: number;
    drainBlockage: number;
    history: number;
    complaints: number;
    elevation: number;
  };
  floodRisk: number;
  priority: number;
  level: string;
  recommendation: string;
  insight: string;
  prediction: string | null;
}

interface HeatmapData {
  points: HeatmapPoint[];
  zones: HeatmapZone[];
  alerts: {
    id: string;
    zoneId: string;
    level: string;
    message: string;
    timestamp: string;
  }[];
}

export default function HeatmapModule() {
  const [range, setRange] = useState('24h');
  const [activeLayers, setActiveLayers] = useState(['complaints', 'flood']);
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null);

  const { data, isLoading, error, refetch } = useQuery<HeatmapData>({
    queryKey: ['heatmap', range],
    queryFn: async () => {
      const res = await fetch(getApiUrl(`/heatmap?range=${range}`));
      if (!res.ok) throw new Error('Failed to synchronize with city geospatial data');
      return res.json();
    }
  });

  const handleDispatch = async (zone: HeatmapZone) => {
    try {
      const res = await fetch(getApiUrl('/heatmap/dispatch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          zoneId: zone.id, 
          priority: zone.priority,
          reason: zone.recommendation
        })
      });
      if (!res.ok) throw new Error('Emergency dispatch protocol failed');
      const result = await res.json();
      toast.success(`${result.message}. Ref: ${result.dispatchRef}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  if (isLoading) return (
    <div className="h-full flex flex-col gap-6">
       <Skeleton className="h-16 w-full rounded-2xl bg-secondary/30" />
       <div className="flex-1 flex gap-6">
          <div className="w-[340px] flex flex-col gap-4">
             <Skeleton className="h-32 w-full rounded-2xl bg-secondary/30" />
             <Skeleton className="flex-1 w-full rounded-2xl bg-secondary/30" />
          </div>
          <Skeleton className="flex-1 h-full rounded-2xl bg-secondary/30" />
       </div>
    </div>
  );

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-black text-foreground mb-2">Urban Intelligence Offline</h2>
      <p className="text-muted-foreground mb-6 max-w-md">The strategic heatmap system is currently unable to reach city data nodes. System fallback engaged.</p>
      <Button onClick={() => refetch()} className="gradient-primary px-10 h-14 rounded-2xl font-black text-white shadow-glow">
        <RefreshCw className="mr-2 h-5 w-5" /> RE-ESTABLISH HANDSHAKE
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)] animate-in fade-in duration-700 pb-8">
      {/* 🔹 TOP CONTROL BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-secondary/20 p-5 rounded-3xl border border-border/40 backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest w-full mb-1 opacity-60">Intelligence Layers</p>
            {[
              { id: 'complaints', label: 'Complaints', color: 'bg-primary' },
              { id: 'flood', label: 'Flood Risk', color: 'bg-red-500' },
              { id: 'drainage', label: 'Drain Blockage', color: 'bg-orange-500' },
              { id: 'garbage', label: 'Garbage Density', color: 'bg-emerald-500' }
            ].map(layer => (
              <Badge 
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`cursor-pointer px-4 py-2 border-2 transition-all font-black text-[10px] tracking-widest ${activeLayers.includes(layer.id) ? `${layer.color} border-transparent text-white shadow-md` : 'bg-background/50 border-border/40 text-muted-foreground hover:border-muted'}`}
              >
                {activeLayers.includes(layer.id) ? <Zap className="h-3 w-3 mr-1.5 animate-pulse" /> : <Layers className="h-3 w-3 mr-1.5" />}
                {layer.label.toUpperCase()}
              </Badge>
            ))}
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex flex-col gap-1">
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Time Horizon</p>
               <div className="flex gap-1 bg-background/40 p-1 rounded-xl border border-border/20">
                  {['LIVE', '24H', '7D', '30D'].map(t => (
                    <Button 
                        key={t}
                        variant={range === t.toLowerCase() ? 'default' : 'ghost'} 
                        size="sm" onClick={() => setRange(t.toLowerCase())} 
                        className={`rounded-lg font-black h-8 px-3 text-[10px] ${range === t.toLowerCase() ? 'bg-primary text-white' : 'text-muted-foreground'}`}
                    >{t}</Button>
                  ))}
               </div>
            </div>

            <div className="flex flex-col gap-1">
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Risk Threshold</p>
               <select 
                  value={riskFilter} 
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="bg-background/40 border border-border/20 rounded-xl px-3 h-10 text-[10px] font-black focus:outline-none ring-primary/20"
               >
                  <option>All Risks</option>
                  <option>Critical Only</option>
                  <option>High Risk</option>
                  <option>Moderate</option>
               </select>
            </div>

            <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl h-10 w-10 mt-4 border border-border/20 bg-background/40 hover:bg-primary/10 hover:text-primary transition-colors"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        {/* 📊 LEFT PANEL */}
        <div className="w-full lg:w-[360px] flex flex-col gap-5 shrink-0">
          {/* 1. Smart Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
             {[
               { label: 'Total Reports', value: data?.points?.length || 0, color: 'text-primary' },
               { label: 'High Risk Zones', value: (data?.zones || []).filter(z => z.floodRisk > 70).length, color: 'text-red-500' },
               { label: 'Active Alerts', value: data?.alerts?.length || 0, color: 'text-orange-500' },
               { label: 'Engineers Deployed', value: 14, color: 'text-emerald-500' }
             ].map((stat, i) => (
                <Card key={i} className="glass-panel border-border/40 p-4 bg-secondary/5 group hover:bg-secondary/10 transition-all">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60 leading-tight">{stat.label}</p>
                    <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                </Card>
             ))}
          </div>

          {/* 2. Live Alerts Feed */}
          <Card className="glass-panel border-border/40 flex flex-col bg-secondary/10 overflow-hidden relative border-l-4 border-l-destructive max-h-[260px]">
             <div className="p-3.5 border-b border-border/40 flex items-center justify-between bg-destructive/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                   <Activity className="h-4 w-4 animate-pulse" /> Live Intelligence Feed
                </h3>
                <div className="h-2 w-2 rounded-full bg-destructive animate-ping" />
             </div>
             <div className="overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar max-h-[200px]">
                {(data?.alerts || []).length === 0 ? (
                   <div className="text-center py-6 opacity-40 italic text-[11px]">Strategic silence: No active threats.</div>
                ) : (data?.alerts || []).map((alert) => (
                   <div key={alert.id} className="p-3 bg-background/40 border border-border/40 rounded-xl relative overflow-hidden group hover:bg-background/60 transition-all cursor-help border-l-4 border-l-destructive/50">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[8px] font-black text-destructive uppercase tracking-tighter bg-destructive/10 px-1.5 py-0.5 rounded-full">{alert.level}</span>
                         <span className="text-[8px] font-medium text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] font-bold leading-tight text-foreground/90">{alert.message}</p>
                   </div>
                ))}
             </div>
          </Card>

          {/* 3. AI Insights */}
          <Card className="glass-panel border-border/40 p-5 bg-primary/5 relative overflow-hidden border-t-4 border-t-primary shadow-glow-sm">
             <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none"><Shield className="h-24 w-24 text-primary" /></div>
             <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" /> AI Predictive Insights
             </h3>
             <div className="space-y-3">
                {(data?.zones || []).filter(z => z.floodRisk > 70).slice(0, 2).map((z, i) => (
                   <div key={i} className="space-y-1 border-l-2 border-primary/30 pl-3">
                      <p className="text-[11px] font-black text-foreground/90 leading-tight">🔍 Ward {String(z.id).replace('z','')}: {z.insight}</p>
                      <p className="text-[10px] font-bold text-muted-foreground italic">"Deploy: {z.recommendation.split('.')[0]}"</p>
                   </div>
                ))}
                {(data?.zones || []).filter(z => z.floodRisk > 70).length === 0 && (
                   <p className="text-[10px] font-bold text-muted-foreground italic text-center py-2">Scanning city topology for anomalies...</p>
                )}
             </div>
          </Card>
        </div>

        {/* 🗺️ MAP AREA (MAPBOX) */}
        <div className="flex-1 relative min-h-[500px] lg:min-h-[600px] rounded-3xl overflow-hidden border border-border/40 shadow-2xl">
           <HeatmapMap 
                data={data || { points: [], zones: [] }} 
                activeLayers={activeLayers}
                onZoneClick={(id) => {
                   const zone = data?.zones.find(z => String(z.id) === id);
                   if (zone) setSelectedZone(zone);
                }} 
           />

           {/* MAP INFO OVERLAY */}
           <div className="absolute top-6 left-6 pointer-events-none z-10">
              <div className="bg-background/90 backdrop-blur-xl p-4 rounded-2xl border border-border/40 shadow-2xl flex items-center gap-4">
                 <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <MapIcon className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">System status</p>
                    <p className="text-xs font-black text-emerald-500 uppercase flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Strategic link active
                    </p>
                 </div>
              </div>
           </div>

           {/* INTERACTION (POPUP) */}
           {selectedZone && (
             <div className="absolute top-6 right-6 w-full max-w-[380px] animate-in slide-in-from-right duration-500 ease-out z-20">
                <Card className="glass-panel border-border/40 p-0 shadow-2xl backdrop-blur-2xl relative overflow-hidden ring-1 ring-white/10">
                   <div className={`h-1.5 w-full ${selectedZone.floodRisk > 70 ? 'bg-red-500' : 'bg-primary'}`} />
                   
                   <div className="p-6">
                      <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setSelectedZone(null)}
                           className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-secondary/50 group"
                      ><X className="h-4 w-4 group-hover:rotate-90 transition-transform" /></Button>

                      <div className="flex justify-between items-start mb-6">
                         <div className="text-left">
                            <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest mb-1 px-2 py-0.5">District intelligence</Badge>
                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">{selectedZone.name}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1 lowercase opacity-60">Calculated priority: {selectedZone.priority}%</p>
                         </div>
                         <div className="text-right flex flex-col items-end">
                            <div className={`text-5xl font-black tracking-tighter ${selectedZone.floodRisk > 70 ? 'text-red-500' : 'text-primary'}`}>{selectedZone.floodRisk}</div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest leading-none">Risk scale</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="p-3 bg-secondary/30 rounded-2xl border border-border/20 shadow-inner group transition-all hover:bg-secondary/40">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 opacity-50 flex items-center justify-between">Rainfall <TrendingUp className="h-3 w-3" /></p>
                            <p className="text-xl font-black">{selectedZone.metrics.rain}mm</p>
                         </div>
                         <div className="p-3 bg-secondary/30 rounded-2xl border border-border/20 shadow-inner group transition-all hover:bg-secondary/40">
                            <p className="text-[9px] font-black text-muted-foreground uppercase mb-1 opacity-50 flex items-center justify-between">Complaints <Users className="h-3 w-3" /></p>
                            <p className="text-xl font-black">{selectedZone.metrics.complaints}</p>
                         </div>
                      </div>

                      {/* Predictive Feature */}
                      {selectedZone.prediction && (
                        <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/30 mb-6 flex items-center justify-between animate-pulse">
                           <div>
                              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Predictive model alert</p>
                              <p className="text-[11px] font-black text-red-100">{selectedZone.prediction}</p>
                           </div>
                           <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                      )}

                      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-6 text-left relative overflow-hidden group">
                         <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform"><MapIcon className="h-16 w-16" /></div>
                         <div className="flex items-center gap-2 mb-2 text-primary">
                            <Shield className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Decision intelligence</span>
                         </div>
                         <p className="text-[11px] font-bold text-foreground/80 leading-relaxed">
                            {selectedZone.recommendation}
                         </p>
                      </div>

                      <div className="flex flex-col gap-3">
                         <Button onClick={() => handleDispatch(selectedZone)} className="w-full h-14 gradient-primary text-white font-black uppercase tracking-widest text-xs shadow-glow-sm hover:translate-y-[-2px] active:translate-y-0 transition-all">
                            <Shield className="mr-3 h-5 w-5" /> Deploy strategic response
                         </Button>
                      </div>
                   </div>
                </Card>
             </div>
           )}

           {/* LEGEND OVERLAY (FLOATING ON MAP) */}
           <div className="absolute bottom-6 left-6 bg-background/80 backdrop-blur-md p-4 rounded-2xl border border-border/30 hidden md:block z-10">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 tracking-widest opacity-70">Risk scale legend</h4>
              <div className="flex flex-col gap-2">
                 {[
                    { c: 'bg-red-600', l: 'Critical', r: '90%' },
                    { c: 'bg-orange-500', l: 'High', r: '70%' },
                    { c: 'bg-yellow-500', l: 'Medium', r: '40%' },
                    { c: 'bg-emerald-500', l: 'Low', r: '<40%' }
                 ].map((leg, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <div className={`h-2.5 w-2.5 rounded-full ${leg.c} shadow-sm shadow-black/20`} />
                       <span className="text-[10px] font-black uppercase tracking-tighter w-16 opacity-80">{leg.l}</span>
                       <span className="text-[10px] font-black opacity-40 text-mono">{leg.r}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
      
      {/* FINAL WINNING LINE */}
      <div className="text-center p-4 bg-secondary/10 rounded-2xl border border-border/30 backdrop-blur-sm mt-2">
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-relaxed">“This is not just a map — it’s a real-time urban intelligence system that predicts risks, alerts authorities, and takes action before disasters happen.”</p>
      </div>
    </div>
  );
}
