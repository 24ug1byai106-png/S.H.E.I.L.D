import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { 
  MapPin, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Activity, 
  Crosshair, 
  Navigation,
  Search,
  Maximize2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReports } from '../lib/api';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
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

const trackedBuildingIcon = new L.DivIcon({
  className: 'custom-marker tracked-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;background:rgba(251,191,36,0.15);border-radius:50%;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:16px;height:16px;background:#fbbf24;border-radius:50%;border:3px solid white;box-shadow:0 0 20px #fbbf2480;"></div>
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

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function haversineDistance(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export const LiveMapPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackedId, setTrackedId] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);
  const [mapZoom, setMapZoom] = useState(13);
  const [realNearbyPlaces, setRealNearbyPlaces] = useState([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [manualLocation, setManualLocation] = useState(null);

  const fetchRealNearbyPlaces = useCallback(async (lat, lng) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    setIsFetchingPlaces(true);
    const mapElement = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapElement);
    const request = {
      location: new window.google.maps.LatLng(lat, lng),
      radius: '1500',
      keyword: 'hospital school police station power water utility university'
    };
    service.nearbySearch(request, (results, status) => {
      setIsFetchingPlaces(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const processed = results.slice(0, 6).map(place => ({
          ...place,
          distance: haversineDistance([lat, lng], [place.geometry.location.lat(), place.geometry.location.lng()])
        })).sort((a, b) => a.distance - b.distance);
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
      const mapped = data.map(r => ({
        id: r.id,
        damageType: r.damage_type,
        severity: r.confidence,
        risk: r.severity === 'HIGH' ? 'Critical' : (r.severity === 'MEDIUM' ? 'Moderate' : 'Low'),
        locationName: r.location_name || 'Urban Sector',
        nearbyHazards: r.nearby_hazards || [],
        lat: r.latitude || 13.0827,
        lng: r.longitude || 80.2707,
        time: new Date(r.created_at).toLocaleString()
      }));
      setReports(mapped);
      
      // Auto-track the newest report if it's different from current
      if (mapped.length > 0 && mapped[0].id !== trackedId && !manualLocation) {
        setTrackedId(mapped[0].id);
        setMapCenter([mapped[0].lat, mapped[0].lng]);
        fetchRealNearbyPlaces(mapped[0].lat, mapped[0].lng);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [trackedId, fetchRealNearbyPlaces, manualLocation]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => fetchReports(true), 10000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handleMapClick = (latlng) => {
    setManualLocation({ lat: latlng.lat, lng: latlng.lng });
    setTrackedId(null);
    setMapCenter([latlng.lat, latlng.lng]);
    fetchRealNearbyPlaces(latlng.lat, latlng.lng);
  };

  const trackedReport = reports.find(r => r.id === trackedId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      
      {/* Sidebar Panel */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 h-full shrink-0">
        <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border-white/10 shadow-2xl h-full">
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-orange" />
              Real-Time Tracker
            </h2>
            <button onClick={() => fetchReports()} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {manualLocation && (
              <div className="bg-brand-orange/10 border border-brand-orange/30 p-4 rounded-2xl relative">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-brand-orange" />
                  <span className="text-[10px] font-black text-brand-orange uppercase">Manual Area Analysis</span>
                </div>
                <p className="text-xs text-white font-bold">Selected Coordinate:</p>
                <p className="text-[10px] font-mono text-slate-400">{manualLocation.lat.toFixed(5)}, {manualLocation.lng.toFixed(5)}</p>
                <button 
                  onClick={() => setManualLocation(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}

            {(trackedReport || manualLocation) && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-red-500/10 pb-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">At-Risk Infrastructure</span>
                  {isFetchingPlaces && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                </div>
                
                {realNearbyPlaces.length > 0 ? (
                  <div className="space-y-2">
                    {realNearbyPlaces.map((place, i) => (
                      <div key={i} className="flex justify-between items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                        <div>
                          <p className="text-[11px] font-bold text-white">{place.name}</p>
                          <p className="text-[9px] text-slate-500 uppercase">{place.types[0].replace(/_/g, ' ')}</p>
                        </div>
                        <span className="text-[10px] font-black text-red-400">
                          {place.distance < 1000 ? `${Math.round(place.distance)}m` : `${(place.distance/1000).toFixed(1)}km`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic">No critical facilities detected in 1.5km radius.</p>
                )}
              </div>
            )}

            {reports.map(r => (
              <div 
                key={r.id}
                onClick={() => {
                  setTrackedId(r.id);
                  setManualLocation(null);
                  setMapCenter([r.lat, r.lng]);
                  fetchRealNearbyPlaces(r.lat, r.lng);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  r.id === trackedId ? 'border-brand-orange bg-brand-orange/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-white">{r.damageType}</p>
                  <Badge level={r.risk}>{r.risk}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <MapPin className="w-3 h-3" />
                  {r.locationName}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Map Area */}
      <div className="flex-1 min-h-[500px] h-full relative">
        <GlassCard className="h-full p-0 overflow-hidden border-white/10">
          <div className="absolute top-4 left-4 z-[1000] space-y-2">
             <div className="bg-brand-dark/90 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               Live Command Center
             </div>
             <div className="bg-brand-dark/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[9px] text-slate-400">
               Click map to analyze specific zone
             </div>
          </div>

          <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full bg-[#1a1b1e]" zoomControl={false}>
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            <MapEvents onMapClick={handleMapClick} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {manualLocation && (
              <Marker position={[manualLocation.lat, manualLocation.lng]} icon={createMarkerIcon('#f97316', true)}>
                <Popup>Target Analysis Point</Popup>
              </Marker>
            )}

            {reports.map(r => (
              <Marker 
                key={r.id} 
                position={[r.lat, r.lng]} 
                icon={r.id === trackedId ? trackedBuildingIcon : (mapIcons[r.risk] || mapIcons.Low)}
                eventHandlers={{ click: () => {
                  setTrackedId(r.id);
                  setManualLocation(null);
                  fetchRealNearbyPlaces(r.lat, r.lng);
                }}}
              >
                <Tooltip>{r.damageType}</Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </GlassCard>
      </div>
    </div>
  );
};
