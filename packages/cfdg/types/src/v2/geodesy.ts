export type KnownStatePlaneProjection = string;
export type StatePlaneProjection = KnownStatePlaneProjection | { code: string; definition: string };
export type StatePlaneInput = { easting: number; northing: number; projection: StatePlaneProjection };
export type Wgs84Input = { longitude: number; latitude: number };
