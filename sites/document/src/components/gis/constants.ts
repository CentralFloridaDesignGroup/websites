import type { GisDatum, PointMaterial } from "./types";
import { KnownStatePlaneProjection } from "cfdg/types";

export const gisDatumOptions: Array<{ value: GisDatum; label: string }> = [
  { value: "wgs84", label: "WGS84" },
  { value: "nad83-2011-fl-east", label: "NAD83 (2011) Florida East" },
  { value: "nad83-2011-fl-north", label: "NAD83 (2011) Florida North" },
  { value: "nad83-2011-fl-west", label: "NAD83 (2011) Florida West" },
  { value: "wgs84", label: "WGS84" },
];

export const statePlaneProjectionOptions: Array<{
  value: KnownStatePlaneProjection;
  label: string;
}> = [
  { value: "EPSG:2236", label: "NAD83 (2011) Florida East" },
  { value: "EPSG:2237", label: "NAD83 (2011) Florida West" },
  { value: "EPSG:2238", label: "NAD83 (2011) Florida North" },
  { value: "EPSG:4326", label: "WGS84" },
];

export function getDatumFromProjection(
  projection: KnownStatePlaneProjection,
): GisDatum {
  switch (projection) {
    case "EPSG:2236":
      return "nad83-2011-fl-east";
    case "EPSG:2237":
      return "nad83-2011-fl-west";
    case "EPSG:2238":
      return "nad83-2011-fl-north";
    case "EPSG:4326":
    default:
      return "wgs84";
  }
}

export function getDatumLabel(datum: GisDatum): string {
  return (
    gisDatumOptions.find((option) => option.value === datum)?.label ?? "WGS84"
  );
}

export function getDefaultProjectionForDatum(
  datum: GisDatum,
): KnownStatePlaneProjection {
  switch (datum) {
    case "nad83-2011-fl-east":
      return "EPSG:2236";
    case "nad83-2011-fl-west":
      return "EPSG:2237";
    case "nad83-2011-fl-north":
      return "EPSG:2238";
    case "wgs84":
    default:
      return "EPSG:2236";
  }
}

export const pointMaterialOptions: Array<{
  value: PointMaterial;
  label: string;
}> = [
  { value: '5/8" Iron Rod', label: '5/8" Iron Rod' },
  { value: '5/8" Iron Rod & Cap', label: '5/8" Iron Rod & Cap' },
  { value: "Mag Nail", label: "Mag Nail" },
  { value: "Mag Nail & Disk", label: "Mag Nail & Disk" },
  { value: "D Nail", label: "D Nail" },
  { value: "Nail in Power Pole", label: "Nail in Power Pole" },
  { value: "Concrete Monument", label: "Concrete Monument" },
  { value: "X Chisel", label: "X Chisel" },
  { value: "Triangle Chisel", label: "Triangle Chisel" },
  { value: "Other", label: "Other" },
];

export const defaultPointMaterial: PointMaterial = '5/8" Iron Rod';

export const horizontalEstablishmentMethodOptions: Array<{
  key: string;
  value: string;
}> = [
  { key: "FDOT RTK GPS", value: "FDOT RTK GPS" },
  { key: "Local RTK GPS", value: "Local RTK GPS" },
  { key: "Static GPS", value: "Static GPS" },
  { key: "Total Station", value: "Total Station" },
  { key: "Assumed", value: "Assumed" },
  { key: "Other", value: "Other" },
];

export const verticalEstablishmentMethodOptions: Array<{
  key: string;
  value: string;
}> = [
  { key: "FDOT RTK GPS", value: "FDOT RTK GPS" },
  { key: "Local RTK GPS", value: "Local RTK GPS" },
  { key: "Static GPS", value: "Static GPS" },
  { key: "Total Station", value: "Total Station" },
  { key: "Leveling", value: "Leveling" },
  { key: "Assumed", value: "Assumed" },
  { key: "Other", value: "Other" },
];
