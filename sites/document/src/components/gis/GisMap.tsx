import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { AddressSearchControl } from "./AddressSearchControl";
import { PopupActions } from "./PopupActions";
import type { BasemapMode, GisRecord } from "./types";

const controlPointIcon = L.divIcon({
  className: "",
  html: '<span class="block h-4 w-4 rounded-full border-2 border-white bg-black"><span class="mx-auto mt-[4px] block h-1 w-1 rounded-full bg-white"></span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

function toPointLabel(record: GisRecord): string {
  return `${record.project_number}-${record.pointNumber}`;
}

type GisMapProps = {
  currentUser: string;
  records: GisRecord[];
  basemapMode: BasemapMode;
  center: [number, number];
  zoomExtentsTrigger?: number;
  onRequestEdit: (record: GisRecord) => void;
};

type ZoomExtentsTriggerProps = {
  records: GisRecord[];
  trigger: number;
};

function ZoomExtentsTrigger({ records, trigger }: ZoomExtentsTriggerProps) {
  const map = useMap();

  useEffect(() => {
    if (trigger === 0 || records.length === 0) return;
    const bounds = L.latLngBounds(records.map((r) => [r.latitude, r.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
  }, [trigger]);

  return null;
}

type DynamicPointMarkersProps = {
  currentUser: string;
  records: GisRecord[];
  onRequestEdit: (record: GisRecord) => void;
};

function DynamicPointMarkers({ currentUser, records, onRequestEdit }: DynamicPointMarkersProps) {
  const map = useMap();
  const [visibleLabelIds, setVisibleLabelIds] = useState<Set<string>>(new Set());
  const [labelsEnabled, setLabelsEnabled] = useState(false);

  const recomputeLabels = useCallback(() => {
    const zoom = map.getZoom();
    const minLabelZoom = 12;

    if (zoom < minLabelZoom) {
      setLabelsEnabled(false);
      setVisibleLabelIds(new Set());
      return;
    }

    const bounds = map.getBounds();
    const gridSize = zoom >= 17 ? 26 : zoom >= 15 ? 34 : zoom >= 13 ? 46 : 58;
    const occupied = new Set<string>();
    const visible = new Set<string>();

    for (const record of records) {
      const latLng = L.latLng(record.latitude, record.longitude);
      if (!bounds.contains(latLng)) {
        continue;
      }

      const point = map.latLngToContainerPoint(latLng);
      const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
      if (occupied.has(key)) {
        continue;
      }

      occupied.add(key);
      visible.add(record.id);
    }

    setLabelsEnabled(true);
    setVisibleLabelIds(visible);
  }, [map, records]);

  useMapEvents({
    zoomend: recomputeLabels,
    moveend: recomputeLabels,
    resize: recomputeLabels,
  });

  useEffect(() => {
    recomputeLabels();
  }, [recomputeLabels]);

  return (
    <>
      {records.map((record) => (
        <Marker
          key={record.id}
          position={[record.latitude, record.longitude]}
          icon={controlPointIcon}
        >
          {labelsEnabled && visibleLabelIds.has(record.id) ? (
            <Tooltip
              permanent
              direction="right"
              offset={[7, 0]}
              opacity={1}
              interactive={true}
              className="gis-point-label"
            >
              {toPointLabel(record)}
            </Tooltip>
          ) : null}
          <Popup>
            <PopupActions currentUser={currentUser} record={record} onEdit={onRequestEdit} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function GisMap({
  currentUser,
  records,
  basemapMode,
  center,
  zoomExtentsTrigger = 0,
  onRequestEdit,
}: GisMapProps) {
  const markers = useMemo(() => records, [records]);
  const tileConfig =
    basemapMode === "satellite"
      ? {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution:
            "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        }
      : {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        };

  return (
    <MapContainer
      center={center}
      zoom={10}
      minZoom={5}
      maxZoom={18}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />

      <AddressSearchControl records={markers} />

      <ZoomExtentsTrigger records={markers} trigger={zoomExtentsTrigger} />

      <DynamicPointMarkers currentUser={currentUser} records={markers} onRequestEdit={onRequestEdit} />
    </MapContainer>
  );
}
