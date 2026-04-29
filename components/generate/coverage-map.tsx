"use client";

import { useEffect, useRef } from "react";
import type { GeoLocation } from "@/lib/edinburgh-locations";

interface CoverageMapProps {
  locations: GeoLocation[];
  radiusMiles: number;
  className?: string;
}

// Miles to metres conversion
const MILES_TO_METRES = 1609.344;

// Gold palette for circles
const CIRCLE_COLORS = [
  "#C9972B",
  "#8B6914",
  "#E8B84B",
  "#A07820",
  "#F0CC6E",
];

export function CoverageMap({ locations, radiusMiles, className }: CoverageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const layersRef = useRef<unknown[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapRef.current) return;

    async function initMap() {
      const L = (await import("leaflet")).default;

      // Fix default icon paths (broken in Next.js)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current!, {
          center: [55.9533, -3.1883],
          zoom: 10,
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current as ReturnType<typeof L.map>;

      // Clear existing layers
      layersRef.current.forEach((layer) => map.removeLayer(layer as ReturnType<typeof L.circle>));
      layersRef.current = [];

      if (locations.length === 0) {
        map.setView([55.9533, -3.1883], 9);
        return;
      }

      const radiusMetres = radiusMiles * MILES_TO_METRES;
      const bounds: [number, number][] = [];

      locations.forEach((loc, i) => {
        const color = CIRCLE_COLORS[i % CIRCLE_COLORS.length];

        // Filled circle
        const circle = L.circle([loc.lat, loc.lng], {
          radius: radiusMetres,
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.7,
        }).addTo(map);

        // Pin marker with gold icon
        const icon = L.divIcon({
          html: `<div style="
            width: 28px; height: 28px;
            background: linear-gradient(135deg, #C9972B, #F0CC6E);
            border: 2px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
          "></div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong style="font-size:13px">${loc.label}</strong><br/><span style="font-size:11px;color:#888">${radiusMiles} mile radius</span>`, {
            closeButton: false,
          });

        layersRef.current.push(circle, marker);

        // Expand bounds to cover circle edge
        bounds.push(
          [loc.lat + (radiusMiles / 69), loc.lng - (radiusMiles / 50)],
          [loc.lat - (radiusMiles / 69), loc.lng + (radiusMiles / 50)]
        );
      });

      // Fit map to all coverage areas
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      }
    }

    initMap();
  }, [locations, radiusMiles]);

  // Load Leaflet CSS dynamically
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ minHeight: 280, borderRadius: "0.75rem", overflow: "hidden" }}
    />
  );
}
