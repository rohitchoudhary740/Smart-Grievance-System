import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix broken default icon paths in bundled Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface LatLngValue {
  lat?: string;
  lng?: string;
}

export function LocationPickerMap({
  value,
  onChange,
  height = '260px',
  defaultCenter = [22.7196, 75.8577],
  defaultZoom = 12,
  autoRequest = true,
  requestNonce,
}: {
  value: LatLngValue;
  onChange: (next: LatLngValue) => void;
  height?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  autoRequest?: boolean;
  requestNonce?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const parsed = useMemo(() => {
    const lat = value.lat ? Number(value.lat) : undefined;
    const lng = value.lng ? Number(value.lng) : undefined;
    return {
      lat: typeof lat === 'number' && !Number.isNaN(lat) ? lat : undefined,
      lng: typeof lng === 'number' && !Number.isNaN(lng) ? lng : undefined,
    };
  }, [value.lat, value.lng]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      parsed.lat !== undefined && parsed.lng !== undefined
        ? [parsed.lat, parsed.lng]
        : defaultCenter;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      initialCenter,
      defaultZoom
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      const next = {
        lat: e.latlng.lat.toFixed(6),
        lng: e.latlng.lng.toFixed(6),
      };
      onChange(next);

      if (markerRef.current) {
        markerRef.current.setLatLng([next.lat as any, next.lng as any] as [number, number]);
      } else {
        markerRef.current = L.marker([next.lat as any, next.lng as any]).addTo(map);
      }

      map.setView([Number(next.lat), Number(next.lng)], Math.max(map.getZoom(), defaultZoom));
    });

    // Place initial marker if we already have coords.
    if (parsed.lat !== undefined && parsed.lng !== undefined) {
      markerRef.current = L.marker([parsed.lat, parsed.lng]).addTo(map);
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker aligned with external value
  useEffect(() => {
    if (!mapRef.current) return;
    if (parsed.lat === undefined || parsed.lng === undefined) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([parsed.lat, parsed.lng]);
    } else {
      markerRef.current = L.marker([parsed.lat, parsed.lng]).addTo(mapRef.current);
    }
    // Avoid aggressively re-centering while user is interacting.
  }, [parsed.lat, parsed.lng]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        };
        onChange(next);
        if (markerRef.current) {
          markerRef.current.setLatLng([Number(next.lat), Number(next.lng)]);
        } else if (mapRef.current) {
          markerRef.current = L.marker([Number(next.lat), Number(next.lng)]).addTo(mapRef.current);
        }
        if (mapRef.current) {
          mapRef.current.setView([Number(next.lat), Number(next.lng)], Math.max(mapRef.current.getZoom(), defaultZoom));
        }
      },
      () => {
        // Ignore silently; parent can decide how to surface UX.
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20_000 }
    );
  };

  // Auto request on mount (for “no coordinates entry” UX).
  useEffect(() => {
    if (!autoRequest) return;
    // Only request after map init (to avoid state updates with no marker).
    if (mapRef.current) requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  useEffect(() => {
    if (requestNonce === undefined) return;
    if (mapRef.current) requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNonce]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
}

