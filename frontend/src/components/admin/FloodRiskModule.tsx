import { useState, useEffect } from 'react';
import { getApiUrl, getBaseUrl } from '@/lib/api';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertOctagon, MapPin, RefreshCw, FileText, Droplets, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Hotspot {
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Moderate' | 'Low';
  riskColor: string;
  address: string;
  totalComplaints: number;
  typeCounts: Record<string, number>;
  unresolvedCount: number;
}

interface FloodData {
  hotspots: Hotspot[];
  summary: {
    totalRelevantComplaints: number;
    criticalZones: number;
    highRiskZones: number;
    issueBreakdown: Record<string, number>;
  };
}

const RISK_COLORS: Record<string, string> = {
  Critical: '#c0392b',
  High: '#e67e22',
  Moderate: '#f1c40f',
  Low: '#27ae60',
};

const RISK_RADII: Record<string, number> = {
  Critical: 8000,
  High: 5000,
  Moderate: 3000,
  Low: 1500,
};

const TYPE_LABELS: Record<string, string> = {
  waterlogging: 'Waterlogging',
  blocked_drain: 'Blocked Drain',
  garbage: 'Garbage Accumulation',
  pothole: 'Pothole',
  road_damage: 'Road Damage',
  drainage: 'Drainage Issue',
};

const TYPE_ICONS: Record<string, string> = {
  waterlogging: '💧',
  blocked_drain: '🚫',
  garbage: '🗑️',
  pothole: '🕳️',
  road_damage: '🛣️',
  drainage: '🌊',
};

export default function FloodRiskModule({ apiUrl }: { apiUrl: string }) {
  const [data, setData] = useState<FloodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/flood-risk/analysis'));
      if (!res.ok) throw new Error('Failed to load flood risk data');
      const json = await res.json();
      setData(json);
      // Auto-select the highest risk hotspot for alerts panel
      if (json.hotspots.length > 0) setSelectedHotspot(json.hotspots[0]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerateAdvisory = async () => {
    if (!selectedHotspot) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch(getApiUrl('/flood-risk/advisory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotspot: selectedHotspot }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`PDF generation failed: ${errText}`);
      }

      const data = await res.json();
      if (!data.downloadUrl) throw new Error('No download URL returned');

      // Open the PDF file URL directly — Chrome downloads it with correct filename
      const BASE_URL = getBaseUrl();
      const fullUrl = `${BASE_URL}${data.downloadUrl}`;

      // Use anchor click with direct URL — no blob, no UUID filenames
      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', data.fileName);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ Advisory PDF ready! File: ${data.fileName}`);
    } catch (err: any) {
      toast.error(`Advisory failed: ${err.message}`);
      console.error('Advisory error:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const mapCenter: [number, number] = selectedHotspot
    ? [selectedHotspot.lat, selectedHotspot.lng]
    : [20.5937, 78.9629];

  const mapZoom = selectedHotspot ? 12 : 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-orange-500" /> Flood Risk Predictor
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Complaint-driven early warning system — based on live garbage, pothole & drainage complaint data.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0 mt-1">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Risk Complaints', value: data.summary.totalRelevantComplaints, color: 'text-orange-500', bg: 'border-orange-500/20' },
            { label: 'Critical Zones', value: data.summary.criticalZones, color: 'text-red-500', bg: 'border-red-500/20' },
            { label: 'High Risk Zones', value: data.summary.highRiskZones, color: 'text-amber-500', bg: 'border-amber-500/20' },
            { label: 'Total Hotspots', value: data.hotspots.length, color: 'text-blue-500', bg: 'border-blue-500/20' },
          ].map((s, i) => (
            <Card key={i} className={`glass-panel ${s.bg}`}>
              <CardContent className="pt-5 pb-4">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Analysing complaint database...</p>
          </div>
        </div>
      ) : data?.hotspots.length === 0 ? (
        <Card className="glass-panel border-green-500/20 bg-green-500/5">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-black text-green-500">No Flood Risk Zones Detected</p>
            <p className="text-sm text-muted-foreground mt-2">
              No active waterlogging, garbage, or drainage complaints with GPS data found in the system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <Card className="lg:col-span-2 glass-panel border-orange-500/20 overflow-hidden" style={{ height: '520px' }}>
            <CardHeader className="bg-orange-500/10 border-b border-orange-500/20 py-3 px-4">
              <CardTitle className="text-orange-500 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" /> Complaint-Driven Risk Hotspots
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  {data?.hotspots.length} zone(s) detected from live complaints
                </span>
              </CardTitle>
            </CardHeader>
            <div className="relative z-0" style={{ height: 'calc(100% - 57px)' }}>
              <MapContainer
                key={`${mapCenter[0]}_${mapCenter[1]}_${mapZoom}`}
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {data?.hotspots.map((h, i) => {
                  const color = RISK_COLORS[h.riskLevel] || '#666';
                  const radius = RISK_RADII[h.riskLevel] || 3000;
                  return (
                    <Circle
                      key={i}
                      center={[h.lat, h.lng]}
                      radius={radius}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2 }}
                      eventHandlers={{ click: () => setSelectedHotspot(h) }}
                    >
                      <Popup>
                        <div className="text-xs font-bold">
                          <p className="font-black text-sm mb-1">{h.riskLevel} Risk Zone</p>
                          <p className="text-gray-600">{h.address}</p>
                          <p className="mt-1">📊 Risk Score: <strong>{h.riskScore}</strong></p>
                          <p>📝 Complaints: <strong>{h.totalComplaints}</strong></p>
                          <p>⚠️ Unresolved: <strong>{h.unresolvedCount}</strong></p>
                          {Object.entries(h.typeCounts).map(([t, c]) => (
                            <p key={t}>{TYPE_ICONS[t] || '•'} {TYPE_LABELS[t] || t}: {c}</p>
                          ))}
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          </Card>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Selected Hotspot Alert */}
            {selectedHotspot && (
              <Card className={`glass-panel ${
                selectedHotspot.riskLevel === 'Critical' ? 'border-red-500/40 bg-red-500/5' :
                selectedHotspot.riskLevel === 'High' ? 'border-orange-500/40 bg-orange-500/5' :
                'border-yellow-500/40 bg-yellow-500/5'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`flex items-center gap-2 text-sm ${
                    selectedHotspot.riskLevel === 'Critical' ? 'text-red-500' :
                    selectedHotspot.riskLevel === 'High' ? 'text-orange-500' : 'text-yellow-500'
                  }`}>
                    <AlertOctagon className="h-4 w-4" />
                    {selectedHotspot.riskLevel} Risk Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-bold text-foreground leading-relaxed">{selectedHotspot.address}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-secondary/30 text-center">
                      <p className="text-lg font-black text-foreground">{selectedHotspot.riskScore}</p>
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Risk Score</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30 text-center">
                      <p className="text-lg font-black text-foreground">{selectedHotspot.unresolvedCount}</p>
                      <p className="text-[9px] uppercase font-black text-muted-foreground">Unresolved</p>
                    </div>
                  </div>

                  {/* Issue type breakdown */}
                  <div className="space-y-1.5">
                    {Object.entries(selectedHotspot.typeCounts).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{TYPE_ICONS[type]} {TYPE_LABELS[type] || type}</span>
                        <Badge variant="secondary" className="text-[10px] font-black">{count}</Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateAdvisory}
                    disabled={generatingPdf}
                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs shadow-lg mt-2"
                  >
                    {generatingPdf ? (
                      <span className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" /> Issue Evacuation Advisory
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Risk Score Key */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Prediction Logic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Risk score computed from live complaint data grouped by GPS location clusters (~5km cells).
                </p>
                {[
                  { label: 'Waterlogging / Drain Blockage', weight: '3×', icon: '💧', color: 'text-red-500' },
                  { label: 'Garbage Accumulation', weight: '2×', icon: '🗑️', color: 'text-orange-500' },
                  { label: 'Pothole / Road Damage', weight: '1×', icon: '🕳️', color: 'text-yellow-500' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{r.icon} {r.label}</span>
                    <Badge className={`${r.color} bg-transparent border border-current text-[10px] font-black`}>{r.weight}</Badge>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/30 space-y-1">
                  {[
                    { level: 'Critical', min: '≥20 pts', color: 'bg-red-500' },
                    { level: 'High', min: '≥10 pts', color: 'bg-orange-500' },
                    { level: 'Moderate', min: '≥5 pts', color: 'bg-yellow-500' },
                    { level: 'Low', min: '<5 pts', color: 'bg-green-500' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className={`h-2.5 w-2.5 rounded-full ${r.color} shrink-0`} />
                      <span className="font-bold">{r.level}</span> — {r.min}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Hotspots List */}
            {data && data.hotspots.length > 1 && (
              <Card className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" /> All Risk Zones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                  {data.hotspots.map((h, i) => (
                    <button
                      key={i}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition-all hover:bg-secondary/40 ${
                        selectedHotspot?.lat === h.lat && selectedHotspot?.lng === h.lng
                          ? 'bg-secondary/60 border-primary/30'
                          : 'border-transparent'
                      }`}
                      onClick={() => setSelectedHotspot(h)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: RISK_COLORS[h.riskLevel] }}
                        />
                        <span className="font-bold truncate flex-1">{h.address}</span>
                        <Badge variant="secondary" className="text-[9px] shrink-0">{h.riskScore}pts</Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 ml-4">{h.totalComplaints} complaint(s) · {h.riskLevel}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
