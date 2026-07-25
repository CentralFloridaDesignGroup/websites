import { KNOWN_STATE_PLANE_PROJECTIONS } from "../constants";

/** Known State Plane Projections */
export type KnownStatePlaneProjection =
  (typeof KNOWN_STATE_PLANE_PROJECTIONS)[number];

/** State Plane Projection, either a known projection or a custom projection with code and definition. */
export type StatePlaneProjection =
  | KnownStatePlaneProjection
  | {
      /** EPSG Code */
      code: string;
      /** Proj4 Definition String */
      definition: string;
    };

/** Input for converting State Plane coordinates to WGS84. */
export type StatePlaneInput = {
  /** Northing coordinate in the State Plane projection */
  northing: number;
  /** Easting coordinate in the State Plane projection */
  easting: number;
  /** State Plane projection to use for the conversion */
  projection: StatePlaneProjection;
};

/** WGS84 coordinates (longitude and latitude). */
export type Wgs84Input = {
  /** Longitude coordinate in WGS84 (East / West) */
  longitude: number;
  /** Latitude coordinate in WGS84 (North / South) */
  latitude: number;
};
