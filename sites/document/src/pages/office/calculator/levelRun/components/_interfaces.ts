/**
 * An interface for the project settings of a level run calculation, including the type of level run, accuracy level, stadia constant, and default wire measurement type for stations.
 */
export interface ProjectSettings {
    /**
     * The type of level run being performed. "closed-loop" indicates that the level run starts and ends at the same point, while "open-loop" indicates that the level run starts and ends at different points.
     */
    levelRunType: 'closed-loop' | 'open-loop';
    /**
     * The accuracy level of the level run, based on the VerticalAccuracyLevels interface.
     */
    accuracyLevel: keyof VerticalAccuracyLevels;
    /**
     * Stadia constant that can be used in calculations if the user is performing a stadia leveling method. This value is not required for non-stadia leveling methods, but can be included for completeness and to support any future features that may require it.
     */
    stadiaConstant: number;
    /**
     * The default wire measurement type for stations in the level run. This can be either "one-wire" or "three-wire", and will determine how the station measurements are interpreted and calculated in the level run process. This setting can be overridden for individual stations if needed, but provides a default value for consistency across the project.
     */
    defaultWireMeasurementType: 'one-wire' | 'three-wire';
}

/**
 * An interface for a level instrument setup. This includes the height of the instrument, measurements to backsights and foresights, and the type of wire measurement used for each.
 */
export interface Station {
    /**
     * A unique identifier for the station, which can be used to reference it in calculations and when displaying station information. This is *not* what the station is called in the field, but rather an internal ID used for data management. This id coorelates to the Point id by using the format `point-${station.id}`. For example, a station with an id of 1 would reference a point with an id of "point-1" for its foresight measurements.
     */
    id: number;
    /**
     * A name for the station, which can be used for display purposes in the UI. This is not required for calculations, but can help users identify and differentiate between stations when viewing station information or selecting stations to edit.
     */
    name?: string;
    /**
     * The type of setup for the station.
     * "standard" indicates a normal setup where the instrument is set up at a station point and takes measurements to a backsight and one or more foresights. 
     * "side-shot" indicates that the instrument hasn't moved from the previous station, but is taking an additional measurement to a side shot point. In this case, the backsight measurements would be the same as the previous station, and only the foresight measurements would be updated for the new point.
     */
    setup: 'standard' | 'side-shot';
    /**
     * Information relating to the backsight measurements taken at the station, including the type of wire measurement used and the upper, lower, and middle stadia readings if applicable.
     */
    backsight: {
        /**
         * one-wire: Only the middle stadia reading is used for calculations. The upper and lower stadia readings are ignored.
         * three-wire: The upper, lower, and middle stadia readings are all used for calculations, allowing for more accurate determination of the point elevation based on the geometry of the setup and the measurements taken.
         */
        type: 'one-wire' | 'three-wire';
        /**
         * The value of the upper stadia reading. Null if not applicable or not provided.
         */
        upperStadia?: number;
        /**
         * The value of the lower stadia reading. Null if not applicable or not provided.
         */
        lowerStadia?: number;
        /**
         * The value of the middle stadia reading. Null if not applicable or not provided.
         */
        middleStadia?: number;
    };
    /**
     * Information relating to the foresight measurements taken at the station, including the type of wire measurement used and the upper, lower, and middle stadia readings if applicable.
     */
    foresight: {
        /**
         * one-wire: Only the middle stadia reading is used for calculations. The upper and lower stadia readings are ignored.
         * three-wire: The upper, lower, and middle stadia readings are all used for calculations, allowing for more accurate determination of the point elevation based on the geometry of the setup and the measurements taken.
         */
        type: 'one-wire' | 'three-wire';
        /**
         * The value of the upper stadia reading. Null if not applicable or not provided.
         */
        upperStadia?: number;
        /**
         * The value of the lower stadia reading. Null if not applicable or not provided.
         */
        lowerStadia?: number;
        /**
         * The value of the middle stadia reading. Null if not applicable or not provided.
         */
        middleStadia?: number;
    };
    /**
     * The height of the instrument setup at the station.
     */
    heightInstrument?: number;
    /**
     * If the station has an error based on the correction data calculations, this field will indicate that and provide an optional message describing the error.
     */
    error?: {
        /**
         * Indicates whether there is an error with the station based on the correction data calculations. 
         */
        isError: boolean,
        /**
         * An optional message describing the error with the station.
         */
        message?: string
    };
}

/**
 * An interface for a measured point in the field, which includes the point's coordinates, elevation, and any corrected elevation values after applying error corrections or adjustments.
 */
export interface Point {
    /**
     * A unique identifier for the point, which can be used to reference it in calculations and when displaying point information. For points that are associated with stations, the id follows the format `point-${station.id}` to link the point to its corresponding station. For example, a station with an id of 1 would have a corresponding point with an id of "point-1". The start and end points of the level run have custom ids "start" and "end" respectively.
     */
    id: string;
    /**
     * The point number or name as recorded in the field. This is used for display purposes and does not affect calculations, but can help users identify and differentiate between points when viewing point information or selecting points to edit. For future use, this field could also be used to allow users to import point data from external sources where the point number is a key identifier, such as a CSV file with point coordinates and elevations.
     */
    pointNumber?: string;
    /**
     * The northing coordinate of the point. Optional if automatic corrections are not required.
     */
    northing?: number;
    /**
     * The easting coordinate of the point. Optional if automatic corrections are not required.
     */
    easting?: number;
    /**
     * The elevation (orthometric) of the point. Required for all points.
     */
    elevation: number;
    /**
     * The description of the point, for clarity.
     */
    description?: string;
    /**
     * An optional field for the corrected elevation of the point after applying error corrections or adjustments based on the correction data.
     */
    correctedElevation?: number;
}

/**
 * An interface for the correction data calculated for a level run, which includes information about whether the level run is within tolerance, the elevation difference between the start and end points, the distance traveled during the level run, and whether corrections can be applied based on the distance and tolerance criteria.
 */
export interface CorrectionData {
    /**
     * Indicates whether the validation function completed without error, irregardless of the level run being within tolerance or not. If false, it means there was an error during the calculation process, such as missing data or invalid inputs, and the results are not reliable.
     */
    successful: boolean;
    /**
     * Indicates whether the level run was provided with distances or coordinates for the points. If true, the level run has the necessary data to calculate distances between points and apply distance-based corrections. If false, the level run does not have distance information, and corrections that rely on distance cannot be applied.
     */
    hasDistances: boolean;
    /**
     * distance is the total distance traveled in kilometers during the level run, calculations preferred based on the coordinates of the points if available or stadia information as a fallback. Otherwise, this field is null.
     */
    distance: number | null;

    /**
     * Selected accuracy value in milimeters
     */
    selectedTolerance: number | null;
    /**
     * Measured accuracy value in milimeters
     */
    measuredTolerance: number | null;
    /**
     * A enum containing the status of the run.
     * "yes" indicates that the level run is within the selected accuracy tolerance and no corrections are needed.
     * "corrections" indicates that the level run is within tolerance but requires corrections to be applied to the point elevations to zero out errors.
     * "no" indicates that the level run is not within the selected accuracy tolerance and corrections cannot be applied.
     * null indicates that the tolerance status cannot be determined, likely due to missing or incomplete data needed for the calculations.
     */
    inTolerance: 'yes' | 'corrections' | 'no' | null;
    /**
     * difference between the measured value of the ending point and the provided elevation of the ending point.
     */
    elevationDifference: number | null;
}

/**
 * National Geodetic Survey (NGS) standards for vertical accuracy levels in leveling work, expressed in millimeters per square root of the distance (in kilometers) (mm √K) between points. These standards are used to determine whether a level run meets the required accuracy criteria based on the order of leveling and class of work being performed.
 */
export interface VerticalAccuracyLevels {
    order1Class1: 3;    // First Order, Class I: 3mm √K
    order1Class2: 4;    // First Order, Class II: 4mm √K
    order2Class1: 6;    // Second Order, Class I: 6mm √K
    order2Class2: 8;    // Second Order, Class II: 8mm √K
    order3: 12;         // Third Order: 12mm √K
}