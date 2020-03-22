import AntennaModel from "./AntennaModel";
import ObservationTarget from "./ObservationTarget";

interface Observation {
    target: ObservationTarget,
    antennas: AntennaModel[],
    duration: number
}

export default Observation