import { KnownStatePlaneProjection } from "cfdg/types";

/** Known State Plane Projections in this module */
export const KNOWN_STATE_PLANE_PROJECTIONS = [
  "EPSG:2236", // Florida East
  "EPSG:2237", // Florida West
  "EPSG:2238", // Florida North
  "EPSG:4326", // WGS84
] as const;

/** State Plane Definitions mapping known projections to their Proj4 definition strings */
export const STATE_PLANE_DEFINITIONS: Record<KnownStatePlaneProjection, string> = {
  "EPSG:2236":
    "+proj=tmerc +lat_0=24.3333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:2237":
    "+proj=tmerc +lat_0=24.3333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000.0001016 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:2238":
    "+proj=lcc +lat_0=29 +lon_0=-84.5 +lat_1=30.75 +lat_2=29.5833333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs +type=crs",
  "EPSG:4326":
    "+proj=longlat +datum=WGS84 +no_defs +type=crs",
};