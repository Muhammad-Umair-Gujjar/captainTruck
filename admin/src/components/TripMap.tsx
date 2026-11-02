import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import type { LiveLocation } from '@/lib/types';

// Vite + Leaflet default icon paths
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const truckIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:#d97706;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(15,23,42,.35);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type Point = { lat: number; lng: number };

type Props = {
  pickup?: Point | null;
  dropoff?: Point | null;
  live?: LiveLocation | null;
  className?: string;
};

function FitBounds({
  pickup,
  dropoff,
  live,
}: {
  pickup?: Point | null;
  dropoff?: Point | null;
  live?: LiveLocation | null;
}) {
  const map = useMap();
  useEffect(() => {
    const pts: L.LatLngExpression[] = [];
    if (pickup) pts.push([pickup.lat, pickup.lng]);
    if (dropoff) pts.push([dropoff.lat, dropoff.lng]);
    if (live) pts.push([live.lat, live.lng]);
    if (pts.length === 0) {
      map.setView([31.52, 74.35], 11);
      return;
    }
    if (pts.length === 1) {
      map.setView(pts[0]!, 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }, [map, pickup, dropoff, live?.lat, live?.lng]);
  return null;
}

export function TripMap({ pickup, dropoff, live, className }: Props) {
  const center: L.LatLngExpression = live
    ? [live.lat, live.lng]
    : pickup
      ? [pickup.lat, pickup.lng]
      : dropoff
        ? [dropoff.lat, dropoff.lng]
        : [31.52, 74.35];

  const routeLine: L.LatLngExpression[] = [];
  if (pickup) routeLine.push([pickup.lat, pickup.lng]);
  if (dropoff) routeLine.push([dropoff.lat, dropoff.lng]);

  return (
    <div
      className={
        className ??
        'h-[420px] w-full overflow-hidden rounded-xl border border-line'
      }
    >
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pickup={pickup} dropoff={dropoff} live={live} />
        {pickup ? <Marker position={[pickup.lat, pickup.lng]} /> : null}
        {dropoff ? <Marker position={[dropoff.lat, dropoff.lng]} /> : null}
        {routeLine.length === 2 ? (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: '#64748b', weight: 3, dashArray: '6 8' }}
          />
        ) : null}
        {live ? (
          <Marker position={[live.lat, live.lng]} icon={truckIcon} />
        ) : null}
      </MapContainer>
    </div>
  );
}
