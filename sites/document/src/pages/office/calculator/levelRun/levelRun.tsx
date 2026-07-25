import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "cfdg/input";
import { Numbers } from "cfdg/scripts"
import { StationInformation, PointInformation, ProjectInformation } from './components'
import { type Point, type ProjectSettings, type CorrectionData, type Station } from "./components/_interfaces";
import { WorkInProgressComponent } from "cfdg/layout";

/* TODO: Stage 1 - Implement a closed-level run calculator with the following features:
- Add stations with backsight and foresight measurements
- Calculate elevations for each station based on the starting point
- Display results in a table format
- Allow users to edit station data and recalculate results
*/
/* TODO: Stage 2 - Implement an open-level run calculator with the following features:
- Similar to closed-level run but without the requirement of returning to the starting point
- Allow users to input known elevations at certain stations for more accurate calculations
- Implement error handling for inconsistent data (e.g., negative elevations, unrealistic measurements)
*/
/* TODO: Stage 3 - Implement side-shot leveling calculations with the following features:
- Allow users to specify side-shot measurements at each station
- Calculate and display the resulting elevations based on side-shot data
- Provide visual indicators for stations with side-shot measurements
*/


export function LevelRun() {
    // TODO: Fix typo defaultWireMeasuurementType -> defaultWireMeasurementType across ProjectSettings and usages.
    const [projectSettings, setProjectSettings] = useState<ProjectSettings>({ levelRunType: 'closed-loop', accuracyLevel: 'order3', stadiaConstant: 100, defaultWireMeasurementType: 'one-wire' });
    const [stations, setStations] = useState<Station[]>([]);
    const [points, setPoints] = useState<Point[]>([]);
    const [errors, setErrors] = useState<{ stationId: number; stationName: string; message: string }[]>([]);
    const [correctionData, setCorrectionData] = useState<CorrectionData>();
    const initialMount = useRef(true);

    useEffect(() => {
        document.title = "Level Run Calculator - The Compass";
    }, []);

    const validateStatia = (stadia?: number) => {
        // Placeholder for actual validation logic
        return stadia !== undefined && stadia > 0;
    };

    // Calculate derived values (heightInstrument and point elevations) based on stations and points
    // This runs on every render but only recalculates when stations or points change
    const { calculatedStations, calculatedPoints } = useMemo(() => {
        if (stations.length === 0) return { calculatedStations: stations, calculatedPoints: points };
        setErrors([]); // Reset errors before calculation

        const newStations: Station[] = [];
        const newPoints: Point[] = [...points];

        for (let i = 0; i < stations.length; i++) {
            const currentStation = { ...stations[i] };
            const currentPointIndex = newPoints.findIndex(p => p.id === `point-${currentStation.id}`);
            const backPoint = i === 0 ? newPoints.find(p => p.id === "start") : newPoints.find(p => p.id === `point-${stations[i - 1].id}`);
            currentStation.error = { isError: false, message: "" }; // Reset error state before validation

            if (backPoint && currentPointIndex !== -1) {
                const startElevation = backPoint.elevation;
                let backStatiaDifference = null; // Placeholder for actual statia difference calculation based on backsight measurements
                let foreStatiaDifference = null; // Placeholder for actual statia difference calculation based on foresight measurements

                // Calculate back statia difference based on the type of backsight measurements
                if (currentStation.backsight.type === "one-wire") {
                    backStatiaDifference = currentStation.backsight.middleStadia || null; // if middle stadia is not provided, we cannot calculate the difference
                } else {
                    if (validateStatia(currentStation.backsight.upperStadia) && validateStatia(currentStation.backsight.middleStadia) && validateStatia(currentStation.backsight.lowerStadia)) {
                        const average = ((currentStation.backsight.upperStadia as number) + (currentStation.backsight.middleStadia as number) + (currentStation.backsight.lowerStadia as number)) / 3;
                        backStatiaDifference = average; // Replace with actual calculation using average and distance if needed
                    }
                }

                // Calculate fore statia difference based on the type of foresight measurements
                if (currentStation.foresight.type === "one-wire") {
                    foreStatiaDifference = currentStation.foresight.middleStadia || null; // if middle stadia is not provided, we cannot calculate the difference
                } else {
                    if (validateStatia(currentStation.foresight.upperStadia) && validateStatia(currentStation.foresight.middleStadia) && validateStatia(currentStation.foresight.lowerStadia)) {
                        const average = ((currentStation.foresight.upperStadia as number) + (currentStation.foresight.middleStadia as number) + (currentStation.foresight.lowerStadia as number)) / 3;
                        foreStatiaDifference = average; // Replace with actual calculation using average and distance if needed
                    }
                }

                if (backStatiaDifference === null || foreStatiaDifference === null) {
                    currentStation.error = {
                        isError: true,
                        message: "Missing stadia measurements for calculation"
                    };
                    setErrors((prev) => [...prev, { stationId: currentStation.id, stationName: currentStation.name ?? '', message: "Missing stadia measurements for calculation" }]);
                    newStations.push(currentStation);
                    continue;
                }

                currentStation.heightInstrument = startElevation + backStatiaDifference;
                const calculatedElevation = currentStation.heightInstrument - foreStatiaDifference;

                newPoints[currentPointIndex] = { ...newPoints[currentPointIndex], elevation: calculatedElevation };
            }

            newStations.push(currentStation);
        }
        return { calculatedStations: newStations, calculatedPoints: newPoints };
    }, [stations, points]);

    useEffect(() => {
        DetermineCoorrections(calculatedStations, calculatedPoints);
    }, [calculatedStations, calculatedPoints, projectSettings.accuracyLevel, projectSettings.levelRunType]);

    // This function will eventually contain the logic to determine if any error corrections or adjustments need to be applied to the calculated elevations based on the project settings and accuracy levels, and update the calculatedPoints state with the corrected elevations. For now, it's just a placeholder to indicate where that logic would go.
    async function DetermineCoorrections(calculatedStations: Station[], calculatedPoints: Point[]) {
        if ((projectSettings.levelRunType === 'closed-loop' && calculatedStations.length < 2) || (projectSettings.levelRunType === 'open-loop' && calculatedStations.length < 1)) return; // We need at least two stations to perform a level run calculation and determine corrections

        let endPoint = calculatedPoints.find(p => projectSettings.levelRunType === 'closed-loop' ? p.id === "start" : p.id === "end"); // For closed-loop, we check the start point against the last point; for open-loop, we check the end point against the last point

        const startPoint = calculatedPoints.find(p => p.id === "start"); // We always use the start point as the reference for corrections, regardless of the level run type, since it's the known elevation point. In a closed-loop, we will compare the start and end points to determine if there is a discrepancy that needs to be corrected. In an open-loop, we may still want to apply corrections based on the starting point's elevation and the calculated elevations of the stations, even though we don't have a return to the starting point.

        const lastStandardStation = calculatedStations.slice().reverse().find(s => s.setup === "standard"); // Find the last station with a standard setup, starting from the end of the list

        const lastPoint = calculatedPoints.find(p => p.id === `point-${lastStandardStation?.id}`); // Find the point corresponding to that station

        let traveledDistance = 0; // Placeholder for actual distance calculation based on station setups and measurements.

        //If all points have a northing and easting, we can calculate the distance traveled using the coordinates of the points. If not, we will rely on the user to input the distance traveled or we can calculate it based on the station setups and measurements if we have enough information.
        const allPointsHaveCoordinates = calculatedPoints.every(p => p.northing !== undefined && p.easting !== undefined);
        if (allPointsHaveCoordinates) {
            for (let i = 0; i < calculatedPoints.length - 1; i++) {
                const pointA = calculatedPoints[i];
                const pointB = calculatedPoints.length === i + 1 ? (projectSettings.levelRunType === 'closed-loop' ? calculatedPoints[0] : calculatedPoints[i + 1]) : calculatedPoints[i + 1]; // For closed-loop, we loop back to the start point; for open-loop, we just calculate up to the last point
                const distance = Numbers.DistanceFromCoordinates(pointA.easting as number, pointA.northing as number, pointB.easting as number, pointB.northing as number);
                console.log(`Calculating distance between Point ${pointA.pointNumber} and Point ${pointB.pointNumber}. Distance: ${distance} feet`);
                traveledDistance += distance;
            }
            console.log(`Total traveled distance: ${traveledDistance} feet`);
        }

        if (startPoint && endPoint && lastPoint) {
            const elevationDifference = (lastPoint.elevation - endPoint.elevation) * 12 * 3.048; // Convert elevation difference from feet to millimeters (since accuracy levels are in mm √K)
            const travelDistanceKm = traveledDistance * 0.0003048; // Convert traveled distance from feet to kilometers.
            const errorValue = (() => {
                switch (projectSettings.accuracyLevel) {
                    case 'order1Class1': return 3;
                    case 'order1Class2': return 4;
                    case 'order2Class1': return 6;
                    case 'order2Class2': return 8;
                    case 'order3': return 12;
                }
            })();

            const tolerance = travelDistanceKm > 0 ? errorValue * Math.sqrt(travelDistanceKm) : errorValue; // Calculate tolerance based on the accuracy level and traveled distance

            setCorrectionData({
                successful: true,
                hasDistances: travelDistanceKm > 0,
                distance: travelDistanceKm,
                elevationDifference: elevationDifference,
                selectedTolerance: tolerance,
                measuredTolerance: Math.abs(elevationDifference),
                inTolerance: Math.abs(elevationDifference) > tolerance ? 'no' : Math.abs(elevationDifference) === tolerance ? 'yes' : 'corrections',
            });
        }
    }

    useEffect(() => {
        if (initialMount.current) {
            setPoints([...points, {
                id: "start",
                pointNumber: "START POINT",
                elevation: 1000.00,
                northing: 500000.000,
                easting: 500000.000,
            },
            {
                id: "end",
                pointNumber: "END POINT",
                elevation: 1000.00,
                northing: 500200.000,
                easting: 500056.000
            }]);
            initialMount.current = false;
            return;
        }
    }, []);

    /**
     * Updates an existing point in the points state or adds it if it doesn't exist. It takes an updatedPoint object as a parameter, checks if a point with the same ID already exists in the points state, and either updates that point or adds the new point to the state accordingly.
     * @param updatedPoint - The point object containing updated information.
     */
    const updatePoint = (updatedPoint: Point) => {
        setPoints((prev) => {
            const existingIndex = prev.findIndex(p => p.id === updatedPoint.id);
            if (existingIndex !== -1) {
                const updatedPoints = [...prev];
                updatedPoints[existingIndex] = updatedPoint;
                return updatedPoints;
            } else {
                return [...prev, updatedPoint];
            }
        });
    };

    /**
     * Creates a new station with default values and adds it to the stations state. If an ID is provided, the new station is inserted after the station with that ID; otherwise, it is added to the end of the list. Additionally, a corresponding point is created and added to the points state, ensuring that the new station has an associated point for elevation calculations.
     * @param id - The ID of the station after which the new station should be inserted. If not provided, the new station is added to the end of the list.
     */
    const createStation = (id?: number) => {
        const newStation: Station = {
            id: stations.length + 1,
            name: `Station ${stations.length + 1}`,
            setup: "standard",
            backsight: {
                // TODO: Update for corrected ProjectSettings key name (defaultWireMeasurementType).
                type: projectSettings.defaultWireMeasurementType
            },
            foresight: {
                // TODO: Update for corrected ProjectSettings key name (defaultWireMeasurementType).
                type: projectSettings.defaultWireMeasurementType
            }
        };
        if (id) {
            // If an ID is provided, we want to insert the new station after the station with that ID
            const index = stations.findIndex(s => s.id === id);
            setStations(prev => [...prev.slice(0, index + 1), newStation, ...prev.slice(index + 1)]);
        } else {
            setStations(prev => [...prev, newStation]);
        }
        const newPoint: Point = {
            id: `point-${newStation.id}`,
            pointNumber: `ST${newStation.id}`,
            elevation: 0
        };
        // Add the new point to the points state but before the last point (which is the end point)
        setPoints(prev => [...prev.slice(0, -1), newPoint, prev[prev.length - 1]]);
    };

    /**
     * Deletes a station by its ID. It removes the station from the stations state and also removes the corresponding point associated with that station from the points state.
     * @param id - The ID of the station to delete.
     */
    const deleteStation = (id: number) => {
        setStations(prev => prev.filter(s => s.id !== id));
        setPoints(prev => prev.filter(p => p.id !== `point-${id}`));
    }

    /**
     * Moves a station up in the list. It finds the index of the station with the given ID and swaps it with the station above it, if it is not already the first station in the list. Also moves the corresponding point up in the points state to maintain the correct association between stations and points.
     * @param id - The ID of the station to move up.
     */
    const moveStationUp = (id: number) => {
        const index = stations.findIndex(s => s.id === id);
        const pointIndex = points.findIndex(p => p.id === `point-${id}`);
        if (index > 0) {
            setStations(prev => {
                const newStations = [...prev];
                [newStations[index - 1], newStations[index]] = [newStations[index], newStations[index - 1]];
                return newStations;
            });
            setPoints(prev => {
                const newPoints = [...prev];
                [newPoints[pointIndex - 1], newPoints[pointIndex]] = [newPoints[pointIndex], newPoints[pointIndex - 1]];
                return newPoints;
            });
        }
    };

    /**
     * Moves a station down in the list. It finds the index of the station with the given ID and swaps it with the station below it, if it is not already the last station in the list. Also moves the corresponding point down in the points state to maintain the correct association between stations and points.
     * @param id - The ID of the station to move down.
     */
    const moveStationDown = (id: number) => {
        const index = stations.findIndex(s => s.id === id);
        const pointIndex = points.findIndex(p => p.id === `point-${id}`);
        if (index < stations.length - 1) {
            setStations(prev => {
                const newStations = [...prev];
                [newStations[index], newStations[index + 1]] = [newStations[index + 1], newStations[index]];
                return newStations;
            });
            setPoints(prev => {
                const newPoints = [...prev];
                [newPoints[pointIndex], newPoints[pointIndex + 1]] = [newPoints[pointIndex + 1], newPoints[pointIndex]];
                return newPoints;
            });
        }
    };

    return (
        <>
            <div className="md:hidden">
                <div className="text-center text-primary font-bold p-4 grow">
                    The Level Run Calculator is not currently available on mobile devices. Please access it on a desktop or laptop for the full experience.
                </div>
            </div>
            <div className="hidden md:block max-w-7xl mx-auto p-4">
                {/* TODO: Make updateProjectSetting type-safe with a generic keyed to ProjectSettings. */}
                <WorkInProgressComponent />
                <ProjectInformation points={calculatedPoints} projectSettings={projectSettings} correctionData={correctionData} updatePoint={updatePoint} updateProjectSetting={(key, value) => setProjectSettings(prev => ({ ...prev, [key]: value }))} />
                <div className="mt-8">
                    {errors.length > 0 && (
                        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                            <p className="font-bold">Errors:</p>
                            {errors.map((error, index) => (
                                <p key={index}>Station ID {error.stationId} {error.stationName.length > 0 ? `(${error.stationName})` : ''}: {error.message}</p>
                            ))}
                        </div>
                    )}
                    <div className="flex flex-row items-center gap-2 mb-4">
                        <h2 className="text-xl font-bold grow-1">Stations</h2>
                        <Button colorMode="auto"
                            label="Import Point coordinates"
                            style="secondary"
                            onClick={() => alert('This feature is not implemented yet. It will allow users to import point coordinates from a CSV file to populate the points data for the level run calculation.')}
                        />
                        <Button colorMode="auto"
                            label="Add Station"
                            style="primary"
                            onClick={() => createStation()}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        {calculatedStations.map((station, index) => (
                            <React.Fragment key={station.id}>
                                <StationInformation
                                    stationInfo={station}
                                    positionMeta={{
                                        currentIndex: index,
                                        totalStations: calculatedStations.length
                                    }}
                                    projectSettings={projectSettings}
                                    onStationChange={(updatedStation) => {
                                        setStations(prev => prev.map(s => s.id === updatedStation.id ? updatedStation : s));
                                    }}
                                    onMoveStationUp={(id) => moveStationUp(id)}
                                    onMoveStationDown={(id) => moveStationDown(id)}
                                    onDeleteStation={(id) => deleteStation(id)}
                                    onAddStation={(id) => createStation(id)}
                                />
                                {calculatedPoints.find(p => p.id === `point-${station.id}`) && (
                                    <PointInformation
                                        key={`point-${station.id}`}
                                        pointInfo={calculatedPoints.find(p => p.id === `point-${station.id}`)!}
                                        setPointInfo={(updatedPoint) => {
                                            setPoints(prev => prev.map(p => p.id === updatedPoint.id ? updatedPoint : p));
                                        }}
                                    />

                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
