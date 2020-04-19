import AntennaModel from "./AntennaModel";
import ObservationTarget from "./ObservationTarget";

interface Observation {
    target: ObservationTarget,
    antennas: AntennaModel[],
    timestamp: string,
    duration: number,
    longitude: number,
    latitude: number,
    wavelength: number,
    samplingRate: number,
    bandwidth: number
}

export default Observation