import AntennaModel from "./AntennaModel";
import ObservationTarget from "./ObservationTarget";

interface Observation {
    target: ObservationTarget,
    antennas: AntennaModel[],
    timestamp: string,
    duration: number,
    latitude: number,
}

export default Observation