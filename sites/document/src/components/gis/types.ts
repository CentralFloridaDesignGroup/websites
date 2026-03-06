export type GisDatum =
  | "wgs84"
  | "nad83-2011-fl-east"
  | "nad83-2011-fl-north"
  | "nad83-2011-fl-west";

export type PointMaterial =
  | '5/8" Iron Rod'
  | '5/8" Iron Rod & Cap'
  | "Mag Nail"
  | "Mag Nail & Disk"
  | "D Nail"
  | "Nail in Power Pole"
  | "Concrete Monument"
  | "X Chisel"
  | "Triangle Chisel"
  | "Other";

export interface GisRecord {
  id: string;
  pointNumber: string;
  northing: number;
  easting: number;
  elevation: number;
  material: PointMaterial;
  witness: string;
  project_number: string;
  notes: string;
  elevation_ngvd29: number | null;
  conversion_factor: number | null;
  conversion_sigma: number | null;
  latitude: number;
  longitude: number;
  sourceDatum: GisDatum;
  additionalFields: AdditionalGisRecordFields;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGisRecordInput {
  pointNumber: string;
  material: PointMaterial;
  witness: string;
  project_number: string;
  notes: string;
  northing: number;
  easting: number;
  elevation: number;
  elevation_ngvd29: number | null;
  conversion_factor: number | null;
  conversion_sigma: number | null;
  additionalFields: AdditionalGisRecordFields;
  latitude: number;
  longitude: number;
  sourceDatum: GisDatum;
  user: string;
}

export interface UpdateGisRecordInput {
  id: string;
  pointNumber: string;
  material: PointMaterial;
  witness: string;
  project_number: string;
  notes: string;
  elevation_ngvd29: number | null;
  conversion_factor: number | null;
  conversion_sigma: number | null;
  northing: number;
  easting: number;
  elevation: number;
  additionalFields: AdditionalGisRecordFields;
  latitude: number;
  longitude: number;
  sourceDatum: GisDatum;
  user: string;
  createdBy?: string;
}

export interface UploadImportSummary {
  created: number;
  failed: number;
  errors: string[];
}

export type BasemapMode = "street" | "satellite";


export type AdditionalGisRecordFields = {
  horizontal_establishment_method?: string;
  vertical_establishment_method?: string;
  horizontal_accuracy?: number;
  vertical_accuracy?: number;
}