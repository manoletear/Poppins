'use client';

import { useEffect, useRef, useState } from 'react';

export interface ParsedAddress {
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
}

// Carga el script de Google Maps (Places) una sola vez.
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es&region=CL`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function comp(components: any[], type: string): string {
  return components.find((c) => c.types.includes(type))?.long_name || '';
}

/**
 * Input de autocompletado de direcciones (Google Places), restringido a Chile.
 * Sólo se renderiza si existe NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; si no, devuelve null
 * y el caller usa sus campos manuales como fallback.
 */
export default function AddressAutocomplete({
  onSelect,
  placeholder = 'Buscá tu dirección...',
}: {
  onSelect: (addr: ParsedAddress) => void;
  placeholder?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let ac: any;
    loadGoogleMaps(apiKey)
      .then(() => {
        const g = (window as any).google;
        if (!g?.maps?.places || !inputRef.current) return;
        ac = new g.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'cl' },
          fields: ['address_components', 'formatted_address'],
          types: ['address'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const comps = place.address_components || [];
          const calle = comp(comps, 'route');
          const numero = comp(comps, 'street_number');
          onSelect({
            direccion: [calle, numero].filter(Boolean).join(' ') || place.formatted_address || '',
            comuna: comp(comps, 'locality') || comp(comps, 'administrative_area_level_3'),
            ciudad: comp(comps, 'administrative_area_level_2'),
            region: comp(comps, 'administrative_area_level_1'),
          });
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      if (ac && (window as any).google) (window as any).google.maps.event?.clearInstanceListeners(ac);
    };
  }, [apiKey, onSelect]);

  if (!apiKey) return null;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">Buscar dirección (Google)</label>
      <input
        ref={inputRef}
        type="text"
        placeholder={ready ? placeholder : 'Cargando buscador...'}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}
