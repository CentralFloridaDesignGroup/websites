import { STATE_PLANE_DEFINITIONS } from "cfdg/constants";
import { StatePlaneProjection, StatePlaneInput, Wgs84Input } from "cfdg/types";
import proj4 from "proj4";

/**
 * Ensures that a value is a finite number.
 *
 * @param value - The value to check.
 * @param field - The name of the field being checked.
 */
function ensureFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }
}

/**
 * Registers a State Plane projection with proj4 if it is not already registered.
 *
 * @param projection - The State Plane projection to register.
 * @returns The projection code.
 */
function registerProjection(projection: StatePlaneProjection): string {
  if (typeof projection === "string") {
    const knownDefinition = STATE_PLANE_DEFINITIONS[projection];
    if (knownDefinition) {
      proj4.defs(projection, knownDefinition);
      return projection;
    }

    const existingDefinition = proj4.defs(projection);
    if (existingDefinition) {
      return projection;
    }

    throw new Error(
      `Projection ${projection} is not registered. Provide a custom { code, definition } projection.`,
    );
  }

  proj4.defs(projection.code, projection.definition);
  return projection.code;
}

/**
 * Converts State Plane northing/easting to WGS84 longitude/latitude.
 */
export function convertStatePlaneToWgs84(
  input: StatePlaneInput,
): Wgs84Input {
  ensureFinite(input.northing, "northing");
  ensureFinite(input.easting, "easting");

  const sourceProjectionCode = registerProjection(input.projection);
  const result = proj4(sourceProjectionCode, "EPSG:4326", [
    input.easting,
    input.northing,
  ]);

  const [longitude, latitude] = result;
  ensureFinite(longitude, "longitude");
  ensureFinite(latitude, "latitude");

  return {
    longitude,
    latitude,
  };
}
