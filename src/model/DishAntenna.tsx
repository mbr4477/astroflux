import AntennaModel from "./AntennaModel";

interface DishAntenna extends AntennaModel {
    diameter: number,
    wavelength: number,
    bandwidth: number,
    eta: number,
}

export default DishAntenna