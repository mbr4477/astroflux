import AntennaModel from "./AntennaModel";

interface DishAntenna extends AntennaModel {
    wavelength: number,
    bandwidth: number,
    eta: number,
    samplingRate: number
}

export default DishAntenna