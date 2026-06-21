import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Grievance, Priority, GrievanceStatus } from '../../types';

// Fix broken default icon paths in bundled Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GrievanceMapProps {
  grievances: Grievance[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  hotZones?: Array<{ ward: string; count: number; lat: number; lng: number }>;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.LOW]:      '#22c55e',
  [Priority.MEDIUM]:   '#f59e0b',
  [Priority.HIGH]:     '#f97316',
  [Priority.CRITICAL]: '#dc2626',
};

function makeMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
    popupAnchor:[0, -10],
  });
}

export function GrievanceMap({
  grievances,
  height = '420px',
  center = [22.7196, 75.8577], // Indore default
  zoom = 12,
  hotZones,
}: GrievanceMapProps) {
  const mapRef       = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);
  const hotZoneLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    hotZoneLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current   = map;

    return () => {
      map.remove();
      mapRef.current  = null;
      layerRef.current = null;
      hotZoneLayerRef.current = null;
    };
  }, []); // eslint-disable-line

  // Update markers when grievances change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    const withGeo = grievances.filter(
      (g) => g.location?.geo?.coordinates?.length === 2
    );

    withGeo.forEach((g) => {
      const [lng, lat] = g.location.geo!.coordinates;
      const color = PRIORITY_COLORS[g.priority] ?? '#6366f1';
      const icon  = makeMarkerIcon(color);

      const statusEmoji: Record<GrievanceStatus, string> = {
        [GrievanceStatus.NEW]:          '🆕',
        [GrievanceStatus.ACCEPTED]:     '✅',
        [GrievanceStatus.IN_PROGRESS]:  '🔧',
        [GrievanceStatus.RESOLVED]:     '✔️',
        [GrievanceStatus.CLOSED]:       '🔒',
        [GrievanceStatus.REJECTED]:     '❌',
        [GrievanceStatus.REOPENED]:     '🔓',
        [GrievanceStatus.SLA_BREACHED]: '⚠️',
      };

      const popup = L.popup({ maxWidth: 260 }).setContent(`
        <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5">
          <p style="font-weight:600;margin:0 0 4px">${g.title}</p>
          <p style="color:#6b7280;margin:0 0 6px;font-size:12px">#${g.ticketNumber}</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:500">
              ${g.priority}
            </span>
            <span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:99px;font-size:11px">
              ${statusEmoji[g.status]} ${g.status.replace('_', ' ')}
            </span>
          </div>
          <p style="color:#4b5563;margin:0;font-size:12px">📍 ${g.location.address}</p>
          ${g.location.ward ? `<p style="color:#9ca3af;margin:4px 0 0;font-size:11px">Ward: ${g.location.ward}</p>` : ''}
        </div>
      `);

      L.marker([lat, lng], { icon })
        .bindPopup(popup)
        .addTo(layerRef.current!);
    });

    // Auto-fit bounds if we have geo points
    if (withGeo.length > 0 && mapRef.current) {
      const coords = withGeo.map((g) => {
        const [lng, lat] = g.location.geo!.coordinates;
        return [lat, lng] as [number, number];
      });
      try {
        mapRef.current.fitBounds(L.latLngBounds(coords), { padding: [32, 32] });
      } catch {
        // ignore if bounds are degenerate
      }
    }
  }, [grievances]);

  // Update red hot zones when they change
  useEffect(() => {
    if (!hotZoneLayerRef.current) return;
    hotZoneLayerRef.current.clearLayers();
    if (!hotZones || hotZones.length === 0) return;

    const maxCount = Math.max(1, ...hotZones.map((z) => z.count));

    hotZones.forEach((z) => {
      if (typeof z.lat !== 'number' || typeof z.lng !== 'number') return;

      const ratio = z.count / maxCount; // 0..1
      const radiusMeters = 500 + Math.round(Math.sqrt(z.count) * 260); // scaled by count
      const fillOpacity = 0.08 + ratio * 0.22;

      L.circle([z.lat, z.lng], {
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity,
        radius: radiusMeters,
      })
        .bindPopup(
          `<strong>🚨 ${z.ward}</strong><br/>${z.count} complaint(s) in this hot zone`
        )
        .addTo(hotZoneLayerRef.current!);
    });
  }, [hotZones]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
}

// ─── Standalone: Critical Zone marker layer ───────────────────────────────────
interface CriticalZoneMapProps {
  zones: Array<{ ward: string; count: number; lat?: number; lng?: number }>;
  height?: string;
}

export function CriticalZoneMap({ zones, height = '300px' }: CriticalZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([22.7196, 75.8577], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    zones.forEach((z) => {
      if (!z.lat || !z.lng) return;
      L.circle([z.lat, z.lng], {
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity: 0.15,
        radius: 800,
      })
        .bindPopup(`<strong>🚨 ${z.ward}</strong><br>${z.count} priority complaints`)
        .addTo(map);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [zones]);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}
