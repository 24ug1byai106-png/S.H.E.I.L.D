import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { MapPin, AlertTriangle, ChevronRight, Loader2, RefreshCw, BarChart3, Activity, Info, Crosshair, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReports } from '../lib/api';

// Fix Leaflet's default icon path issues using CDN for stability
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Premium Custom Marker Icons with Pulse Effect for Critical
const createMarkerIcon = (color, isCritical = false) => {
  return new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${isCritical ? `<div style="position:absolute;width:32px;height:32px;background:${color};opacity:0.3;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        <div style="position:relative;width:14px;height:14px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px ${color}80;"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Nearest building marker — a distinctive cyan pulsing ring
const nearestBuildingIcon = new L.DivIcon({
  className: 'custom-marker nearest-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:36px;height:36px;border:2.5px solid #06b6d4;border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;opacity:0.5;"></div>
      <div style="position:absolute;width:24px;height:24px;border:2px solid #06b6d4;border-radius:50%;opacity:0.3;"></div>
      <div style="position:relative;width:10px;height:10px;background:#06b6d4;border-radius:50%;border:2px solid white;box-shadow:0 0 12px #06b6d480;"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Latest/tracked building — gold star marker
const trackedBuildingIcon = new L.DivIcon({
  className: 'custom-marker tracked-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;background:rgba(251,191,36,0.15);border-radius:50%;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;width:30px;height:30px;background:rgba(251,191,36,0.2);border-radius:50%;"></div>
      <div style="position:relative;width:16px;height:16px;background:#fbbf24;border-radius:50%;border:3px solid white;box-shadow:0 0 20px #fbbf2480, 0 2px 8px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const mapIcons = {
  Critical: createMarkerIcon('#ef4444', true),
  High: createMarkerIcon('#ef4444', true),
  Moderate: createMarkerIcon('#f97316'),
  Medium: createMarkerIcon('#f97316'),
  Infrastructure: createMarkerIcon('#3b82f6'),
  Low: createMarkerIcon('#3b82f6'),
};

/**
 * MapUpdater — dynamically recenters the map with smooth animation
 * when the target center/zoom changes.
 */
function MapUpdater({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoom, map]);

  return null;
}

/**
 * Haversine distance in meters between two [lat, lng] points.
 */
function haversineDistance(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export const DashboardPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trackedId, setTrackedId] = useState(null); // currently tracked report
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);
  const [mapZoom, setMapZoom] = useState(12);
  const [realNearbyPlaces, setRealNearbyPlaces] = useState([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Default Center: Chennai
  const defaultCenter = [13.0827, 80.2707];

  // Fetch real-world critical infrastructure using Google Places API
  const fetchRealNearbyPlaces = useCallback(async (lat, lng) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    setIsFetchingPlaces(true);
    setRealNearbyPlaces([]); // Clear previous results to ensure fresh analysis for this location

    const mapElement = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapElement);
    
    // Use keywords to find a broader set of critical infrastructure specific to this location
    const request = {
      location: new window.google.maps.LatLng(lat, lng),
      radius: '1200', // 1.2km search radius
      keyword: 'hospital school university station utility power water police'
    };

    service.nearbySearch(request, (results, status) => {
      setIsFetchingPlaces(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Map and calculate distances to provide detailed analysis
        const processed = results.slice(0, 5).map(place => {
          const pLat = place.geometry.location.lat();
          const pLng = place.geometry.location.lng();
          const dist = haversineDistance([lat, lng], [pLat, pLng]);
          return {
            ...place,
            distance: dist
          };
        });
        
        // Sort by distance to show the most immediate threats first
        processed.sort((a, b) => a.distance - b.distance);
        setRealNearbyPlaces(processed);
      } else {
        setRealNearbyPlaces([]);
      }
    });
  }, []);

  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getReports();

      const mapped = data.map(r => {
        let risk = r.severity;
        if (risk === 'HIGH') risk = 'Critical';
        if (risk === 'MEDIUM') risk = 'Moderate';
        if (risk === 'LOW') risk = 'Infrastructure';

        const radius = risk === 'Critical' ? 150 : (risk === 'Moderate' ? 80 : 30);

        return {
          id: r.id,
          damageType: r.damage_type,
          severity: r.confidence,
          risk: risk,
          locationName: r.location_name || 'Chennai District',
          nearbyHazards: r.nearby_hazards || [],
          impactRadius: radius,
          lat: r.latitude || 13.0827,
          lng: r.longitude || 80.2707,
          time: r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now'
        };
      });

      setReports(mapped);

      // Auto-track the latest report if none is tracked
      if (mapped.length > 0) {
        const latest = mapped[0]; // reports sorted by created_at desc
        if (!trackedId || !mapped.find(r => r.id === trackedId)) {
          setTrackedId(latest.id);
          setMapCenter([latest.lat, latest.lng]);
          setMapZoom(15);
          fetchRealNearbyPlaces(latest.lat, latest.lng);
        }
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [trackedId, fetchRealNearbyPlaces]);

  // Initial fetch + auto-refresh every 8 seconds for "live" feel
  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => fetchReports(true), 8000);
    return () => clearInterval(interval);
  }, [fetchReports, refreshKey]);

  // Find the tracked report and its nearest neighbor
  const trackedReport = reports.find(r => r.id === trackedId);
  let nearestReport = null;

  if (trackedReport && reports.length > 1) {
    let minDist = Infinity;
    for (const r of reports) {
      if (r.id === trackedId) continue;
      const dist = haversineDistance(
        [trackedReport.lat, trackedReport.lng],
        [r.lat, r.lng]
      );
      if (dist < minDist) {
        minDist = dist;
        nearestReport = { ...r, distance: dist };
      }
    }
  }

  // Re-fetch nearby places if google maps loads late
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places && trackedReport && realNearbyPlaces.length === 0) {
       fetchRealNearbyPlaces(trackedReport.lat, trackedReport.lng);
    }
  }, [trackedReport, fetchRealNearbyPlaces, realNearbyPlaces.length]);

  // Handle clicking a report card to track it
  const handleTrack = (report) => {
    setTrackedId(report.id);
    setMapCenter([report.lat, report.lng]);
    setMapZoom(16);
    fetchRealNearbyPlaces(report.lat, report.lng);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] animate-in fade-in duration-500">
      
      {/* 1. LEFT SIDEBAR: Tracked Building + Nearby Hazards */}
      <div className="w-full lg:w-[420px] flex flex-col gap-4 h-full shrink-0">
        <GlassCard className="flex flex-col p-0 overflow-hidden border-white/10 shadow-2xl h-full max-h-[85vh]">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-orange" />
              Live Tracking
            </h2>
            <button 
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ maxHeight: '70vh' }}>
            {isLoading ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                <p className="text-sm font-medium">Connecting to central server...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-slate-400 text-sm italic">No active incidents detected.</p>
                <Link to="/" className="text-brand-orange text-xs mt-3 inline-block hover:underline font-bold">Upload a Report →</Link>
              </div>
            ) : (
              <>
                {/* ═══ TRACKED BUILDING CARD ═══ */}
                {trackedReport && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,0.3)', background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.02) 100%)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
                      <Crosshair className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Tracked Building</span>
                      <div className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{trackedReport.damageType}</h3>
                        <Badge level={trackedReport.risk}>{trackedReport.risk}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                        <span className="font-semibold">{trackedReport.locationName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                        <span>{trackedReport.lat.toFixed(4)}°N, {trackedReport.lng.toFixed(4)}°E</span>
                        <span>{(trackedReport.severity * 100).toFixed(0)}% conf</span>
                      </div>
                      <Link to={`/report/${trackedReport.id}`} className="block mt-2">
                        <button className="w-full py-2 bg-amber-400/10 text-amber-400 text-[10px] font-black rounded-lg hover:bg-amber-400/20 transition-all uppercase tracking-widest border border-amber-400/20">
                          View Full Analysis →
                        </button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* ═══ NEARBY PLACES AT RISK ═══ */}
                {trackedReport && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.01) 100%)' }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Nearby Infrastructure at Risk</span>
                      {isFetchingPlaces && <Loader2 className="w-3 h-3 animate-spin text-red-400/50" />}
                    </div>
                    <div className="p-3 space-y-2">
                      {/* Real Places from Google */}
                      {realNearbyPlaces.map((place, idx) => (
                        <div key={`real-${idx}`} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-red-400/20 hover:bg-red-500/[0.03] transition-all group">
                          <div className="mt-0.5 w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            {place.icon && <img src={place.icon} alt="" className="w-3 h-3 opacity-70 group-hover:opacity-100" style={{ filter: 'invert(1) brightness(2)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-white leading-snug">{place.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-widest">
                                {place.types ? place.types[0].replace(/_/g, ' ') : 'Critical Facility'}
                              </p>
                              <span className="text-[8px] text-slate-500 font-mono">
                                • {place.distance < 1 ? `${(place.distance * 1000).toFixed(0)}m` : `${place.distance.toFixed(1)}km`}
                              </span>
                            </div>
                          </div>
                          <div className="text-[9px] font-black text-red-400/40 shrink-0 mt-0.5 uppercase tracking-tighter">At Risk</div>
                        </div>
                      ))}

                      {/* Simulated Hazards if no real ones found or in addition */}
                      {realNearbyPlaces.length === 0 && trackedReport.nearbyHazards.map((hazard, idx) => (
                        <div key={`sim-${idx}`} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-red-400/20 hover:bg-red-500/[0.03] transition-all group">
                          <div className="mt-0.5 w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-white leading-snug">{hazard}</p>
                            <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-widest mt-1">Potential Impact Zone</p>
                          </div>
                          <AlertTriangle className="w-3 h-3 text-red-400/40 shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══ NEAREST BUILDING ═══ */}
                {nearestReport && (
                  <div 
                    className="rounded-2xl overflow-hidden cursor-pointer hover:scale-[0.99] transition-transform"
                    style={{ border: '1px solid rgba(6,182,212,0.25)', background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.01) 100%)' }}
                    onClick={() => handleTrack(nearestReport)}
                  >
                    <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(6,182,212,0.08)', borderBottom: '1px solid rgba(6,182,212,0.12)' }}>
                      <Navigation className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Nearest Building</span>
                      <span className="ml-auto text-[9px] font-mono text-cyan-400/70">
                        {nearestReport.distance < 1000
                          ? `${Math.round(nearestReport.distance)}m`
                          : `${(nearestReport.distance / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{nearestReport.damageType}</h3>
                        <Badge level={nearestReport.risk}>{nearestReport.risk}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span>{nearestReport.locationName}</span>
                      </div>
                      {nearestReport.nearbyHazards && nearestReport.nearbyHazards.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Also threatens:</p>
                          {nearestReport.nearbyHazards.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
                              <div className="w-1 h-1 rounded-full bg-cyan-400" />
                              {h}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══ DIVIDER ═══ */}
                {reports.length > 1 && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">All Incidents ({reports.length})</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )}

                {/* ═══ COMPACT INCIDENT LIST ═══ */}
                {reports.map((report) => {
                  const isTracked = report.id === trackedId;
                  const isNearest = nearestReport && report.id === nearestReport.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleTrack(report)}
                      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-3 group ${
                        isTracked ? 'bg-amber-400/5 border border-amber-400/20' :
                        isNearest ? 'bg-cyan-400/5 border border-cyan-400/15' :
                        'bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isTracked ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' :
                        isNearest ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]' :
                        report.risk === 'Critical' ? 'bg-red-500' :
                        report.risk === 'Moderate' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-brand-orange transition-colors">{report.damageType}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {report.locationName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge level={report.risk}>{report.risk}</Badge>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-white/5">
             <Link to="/insights">
              <button className="w-full py-3 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-orange/20 hover:bg-brand-orange/90 hover:scale-[0.98] active:scale-[0.95] transition-all flex items-center justify-center gap-2">
                <BarChart3 className="w-4 h-4" />
                VIEW ANALYTICS DASHBOARD
              </button>
             </Link>
          </div>
        </GlassCard>
      </div>

      {/* 2. MAP AREA: Smart City Visualization */}
      <div className="flex-1 min-h-[500px] h-full relative">
        <GlassCard className="h-full p-0 overflow-hidden border-white/10 shadow-2xl relative">
          {/* Map Overlay UI */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <div className="bg-brand-dark/90 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live {trackedReport?.locationName || reports[0]?.locationName || 'City'} Monitoring
            </div>
            
            {/* Legend */}
            <div className="bg-brand-dark/80 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-2xl space-y-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Issue Legend</p>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span>Critical / High Risk</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Moderate Damage</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Infrastructure Note</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium mt-1 pt-1 border-t border-white/10">
                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <span>Tracked Building</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
                <span>Nearest Building</span>
              </div>
            </div>
          </div>

          {/* Tracking info overlay (top right) */}
          {trackedReport && (
            <div className="absolute top-4 right-4 z-[1000]">
              <div className="bg-brand-dark/90 backdrop-blur-md p-4 rounded-xl border border-amber-400/20 shadow-2xl max-w-[260px]">
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Live Tracking</span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{trackedReport.damageType}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-brand-orange" />
                  {trackedReport.locationName}
                </p>
                <div className="text-[9px] font-mono text-slate-500">
                  {trackedReport.lat.toFixed(4)}°N, {trackedReport.lng.toFixed(4)}°E
                </div>
                {nearestReport && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-1">
                      <Navigation className="w-3 h-3" />
                      Nearest
                    </div>
                    <p className="text-[10px] text-white font-semibold">{nearestReport.damageType}</p>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {nearestReport.distance < 1000
                        ? `${Math.round(nearestReport.distance)}m away`
                        : `${(nearestReport.distance / 1000).toFixed(1)}km away`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <MapContainer center={defaultCenter} zoom={12} className="w-full h-full bg-[#1a1b1e]" zoomControl={false}>
            {/* Dynamic map recentering */}
            <MapUpdater center={mapCenter} zoom={mapZoom} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Real Nearby Places Markers (as small warning dots) */}
            {realNearbyPlaces.map((place, idx) => {
              if (!place.geometry || !place.geometry.location) return null;
              return (
                <Marker
                  key={`place-${idx}`}
                  position={[place.geometry.location.lat(), place.geometry.location.lng()]}
                  icon={new L.DivIcon({
                    className: 'custom-marker',
                    html: `<div style="width:8px;height:8px;background:#ef4444;border-radius:50%;border:1.5px solid white;box-shadow:0 0 10px rgba(239,68,68,0.8);"></div>`,
                    iconSize: [8, 8],
                    iconAnchor: [4, 4]
                  })}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                    <div className="text-[9px] font-black text-red-500 uppercase tracking-tighter bg-slate-900 px-1.5 py-0.5 rounded border border-red-500/30">
                      AT RISK: {place.name}
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}

            {reports.map((report) => {
              const isTracked = report.id === trackedId;
              const isNearest = nearestReport && report.id === nearestReport.id;

              // Choose marker icon based on tracking state
              let icon;
              if (isTracked) {
                icon = trackedBuildingIcon;
              } else if (isNearest) {
                icon = nearestBuildingIcon;
              } else {
                icon = mapIcons[report.risk] || mapIcons.Low;
              }

              // Choose circle color
              let circleColor;
              if (isTracked) {
                circleColor = '#fbbf24';
              } else if (isNearest) {
                circleColor = '#06b6d4';
              } else {
                circleColor = report.risk === 'Critical' ? '#ef4444' : (report.risk === 'Moderate' ? '#f97316' : '#3b82f6');
              }

              return (
                <React.Fragment key={report.id}>
                  <Marker 
                    position={[report.lat, report.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => handleTrack(report),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 4px' }}>
                        {isTracked ? '📍 ' : isNearest ? '🔗 ' : ''}
                        {report.damageType} — {report.locationName}
                      </div>
                    </Tooltip>
                    <Popup className="premium-popup">
                      <div className="p-3 min-w-[240px] bg-slate-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white text-sm">{report.damageType}</span>
                          <Badge level={report.risk}>{report.risk}</Badge>
                        </div>
                        <p className="text-[11px] text-brand-orange font-bold mb-3 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.locationName}
                        </p>
                        
                        {report.nearbyHazards.length > 0 && (
                          <div className="mb-4 bg-white/5 p-2 rounded border border-white/10">
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Impact Analysis (Nearby Hazards):</p>
                            <ul className="space-y-1">
                              {report.nearbyHazards.map((h, idx) => (
                                <li key={idx} className="text-[10px] text-white/80 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-red-400 rounded-full" />
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Link 
                          to={`/report/${report.id}`}
                          className="block w-full text-center bg-white text-slate-900 text-[10px] font-bold py-2 rounded-md hover:bg-slate-200 transition-colors uppercase tracking-widest"
                        >
                          Open Full Analysis
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                  
                  <Circle 
                    center={[report.lat, report.lng]}
                    radius={isTracked ? report.impactRadius * 1.5 : report.impactRadius}
                    pathOptions={{ 
                      color: circleColor,
                      fillColor: circleColor,
                      fillOpacity: isTracked ? 0.2 : (isNearest ? 0.18 : 0.12),
                      weight: isTracked ? 2.5 : (isNearest ? 2 : 1),
                      dashArray: isNearest ? '6 4' : undefined,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </MapContainer>

        </GlassCard>
      </div>
    </div>
  );
};
