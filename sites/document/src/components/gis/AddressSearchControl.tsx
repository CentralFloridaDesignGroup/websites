import { useMemo, useState } from "react";
import { Button } from "cfdg/input";
import { MapPin } from "lucide-react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import type { GisRecord } from "./types";

type AddressSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type AddressSearchMarker = {
  latitude: number;
  longitude: number;
  label: string;
};

const searchResultIcon = L.divIcon({
  className: "gis-search-pin-wrapper",
  html: renderToStaticMarkup(
    <MapPin className="h-10 w-10 text-primary" strokeWidth={2} />,
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

type AddressSearchControlProps = {
  records?: GisRecord[];
};

function toPointLabel(record: GisRecord): string {
  return `${record.project_number}-${record.pointNumber}`;
}

export function AddressSearchControl({ records = [] }: AddressSearchControlProps) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [resultMarker, setResultMarker] = useState<AddressSearchMarker | null>(null);

  const matchingRecords = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return records
      .filter((r) =>
        toPointLabel(r).toLowerCase().includes(trimmed) ||
        r.pointNumber.toLowerCase().includes(trimmed) ||
        r.project_number.toLowerCase().includes(trimmed)
      )
      .slice(0, 6);
  }, [query, records]);

  function clearSearch() {
    setQuery("");
    setError("");
    setResults([]);
    setResultMarker(null);
  }

  async function runSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResultMarker(null);

      const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(trimmed)}`;
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Address lookup failed (${response.status}).`);
      }

      const payload = (await response.json()) as AddressSearchResult[];
      setResults(payload);
      if (payload.length === 0) {
        setError("No matching addresses found.");
      }

      if (payload.length === 1) {
        const single = payload[0];
        const latitude = Number(single.lat);
        const longitude = Number(single.lon);
        map.flyTo([latitude, longitude], 16, { duration: 0.9 });
        setResultMarker({
          latitude,
          longitude,
          label: single.display_name,
        });
      }
    } catch (searchError) {
      setResults([]);
      setError(String(searchError));
    } finally {
      setLoading(false);
    }
  }

  function chooseResult(result: AddressSearchResult) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    map.flyTo([latitude, longitude], 17, { duration: 0.9 });
    setResultMarker({
      latitude,
      longitude,
      label: result.display_name,
    });
    setQuery(result.display_name);
    setResults([]);
  }

  function chooseRecord(record: GisRecord) {
    map.flyTo([record.latitude, record.longitude], 18, { duration: 0.9 });
    setResultMarker(null);
    setQuery(toPointLabel(record));
    setResults([]);
  }

  return (
    <div className="absolute right-3 md:left-14 top-3 z-[500] min-w-[300px] max-w-[400px] rounded-md border border-slate-300 bg-white/95 p-2 shadow-md backdrop-blur dark:bg-gray-700/75">
      <div className="space-y-2">
        <form className="flex items-center gap-1.5" onSubmit={runSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search address or place"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm leading-5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-700/75 dark:text-white dark:focus:border-blue-400"
          />
          {query.trim() ? (
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-700/75 dark:text-white dark:hover:bg-gray-600"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
          <Button colorMode="auto"
            label={loading ? "..." : "Search"}
            style="primary"
            size="small"
            properties={{ disabled: loading, classNames: "rounded-lg text-sm whitespace-nowrap" }}
          />
        </form>

        {error ? <div className="text-xs text-red-700">{error}</div> : null}

        {(matchingRecords.length > 0 || results.length > 0) ? (
          <ul className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-gray-600 dark:bg-gray-700/75">
            {matchingRecords.length > 0 ? (
              <>
                <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-gray-600 dark:text-gray-300">
                  Control Points
                </li>
                {matchingRecords.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => chooseRecord(record)}
                      className="w-full border-b border-slate-100 px-2.5 py-2 text-left text-xs leading-5 text-slate-900 transition hover:bg-slate-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                    >
                      <span className="font-medium">{toPointLabel(record)}</span>
                      {record.notes ? (
                        <span className="ml-1.5 text-slate-500 truncate">{record.notes}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </>
            ) : null}
            {results.length > 0 ? (
              <>
                {matchingRecords.length > 0 ? (
                  <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-gray-600 dark:text-gray-300">
                    Addresses
                  </li>
                ) : null}
                {results.map((result) => (
                  <li key={result.place_id}>
                    <button
                      type="button"
                      onClick={() => chooseResult(result)}
                      className="w-full border-b border-slate-100 px-2.5 py-2 text-left text-xs leading-5 text-slate-900 transition hover:bg-slate-50 last:border-b-0 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                    >
                      {result.display_name}
                    </button>
                  </li>
                ))}
              </>
            ) : null}
          </ul>
        ) : null}

        {resultMarker ? (
          <Marker position={[resultMarker.latitude, resultMarker.longitude]} icon={searchResultIcon}>
            <Popup>{resultMarker.label}</Popup>
          </Marker>
        ) : null}
      </div>
    </div>
  );
}
