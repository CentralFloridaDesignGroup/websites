import proj4 from "proj4";

export type KnownStatePlaneProjection =
  | "EPSG:2236" // NAD83 / Florida East (ftUS)
  | "EPSG:2237" // NAD83 / Florida West (ftUS)
  | "EPSG:2238" // NAD83 / Florida North (ftUS)
  | "EPSG:4326" // WGS84

export type StatePlaneProjection =
  | KnownStatePlaneProjection
  | {
      code: string;
      definition: string;
    };

export type StatePlaneToWgs84Input = {
  northing: number;
  easting: number;
  projection: StatePlaneProjection;
};

export type Wgs84Coordinates = {
  longitude: number;
  latitude: number;
};

const STATE_PLANE_DEFINITIONS: Record<KnownStatePlaneProjection, string> = {
  "EPSG:2236":
    "+proj=tmerc +lat_0=24.3333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:2237":
    "+proj=tmerc +lat_0=24.3333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:2238":
    "+proj=lcc +lat_0=29 +lon_0=-84.5 +lat_1=30.75 +lat_2=29.5833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:4326":
    "+proj=longlat +datum=WGS84 +no_defs +type=crs",
};

function ensureFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }
}

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
  input: StatePlaneToWgs84Input,
): Wgs84Coordinates {
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
