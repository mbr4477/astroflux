import AntennaModel from "../../model/AntennaModel";
import { AntennaBounds } from "./AntennaVisual";
import ObservationRunner from "../../domain/ObservationRunner";
import Observation from "../../model/Observation";
import ObservationFileUtil from "../../domain/ObservationFileUtil";
import { remote } from 'electron'
import { join } from 'path'
import ObservationResult from "../../model/ObservationResult";


export interface ObsFormData {
    ra: string,
    dec: string,
    duration: string,
    latitude: string,
    longitude: string,
    timestamp: string,
    wavelength: string,
    size: string,
    eta: string,
    skyOptions: { value: string, title: string }[],
    sky: string,
}

export interface IHomeView {
    showAntennas(antennas: AntennaModel[]): void
    setAnimating(animating: boolean): void
    setFocusedAntenna(focusedAntenna?: AntennaModel, focusedAntennaBounds?: AntennaBounds): void
    showFormData(formData: ObsFormData): void
    setObserveButtonDisabled(disabled: boolean): void
    showResult(result: ObservationResult): void
    dismissResult(): void
}


const FITS_SKY_MAP = join(
    remote.app.getAppPath(), 
    'python',
    'lambda_mollweide_STOCKERT+VILLA-ELISA_1420MHz_1_256.fits')

const DEFAULT_DISH_JSON = JSON.stringify({
    id: "0",
    x: 0,
    y: 0,
    size: 1.0,
    eta: 0.5,
});

export class HomePresenter {
    static FILEFILTERS: {name: string, extensions: string[]}[] = [
        { name: 'Observation', extensions: [ 'aflux' ] }
    ]
    view: IHomeView
    data: Observation
    formData: ObsFormData
    constructor(view: IHomeView) {
        this.view = view
        this.data = {
            target: { ra: 0, dec: 0 },
            duration: 0,
            latitude: 0,
            longitude: 0,
            antennas: [ JSON.parse(DEFAULT_DISH_JSON) ],
            timestamp: (new Date()).toLocaleString('sv').replace(' ', 'T').substr(0,19),
            wavelength: 0.21,
            samplingRate: 1e3,
            bandwidth: 1e6
        }
        this.formData = {
            ra: '0',
            dec: '0',
            duration: '0',
            latitude: '0',
            longitude: '0',
            timestamp: this.data.timestamp,
            wavelength: '0.21',
            size: '1',
            eta: '0.5',
            skyOptions: [
                {
                    value: 'stars',
                    title: 'Stars'
                },
                {
                    value: 'cross',
                    title: 'Cross',
                },
                {
                    value: FITS_SKY_MAP,
                    title: 'Stockert Villa-Elisa 21-cm Sky Survey'
                }
            ],
            sky: 'stars'
        }
    }
    
    updateObservation(field: string, value: string) {
        if (field === 'size') {
            this.formData.size = value
            this.data.antennas = this.data.antennas.map(a => {
                a.size = parseFloat(value) || a.size
                return a
            })
        } else if (field === 'eta') {
            this.formData.eta = value
            this.data.antennas = this.data.antennas.map(a => {
                a.eta = parseFloat(value) || a.eta
                return a
            })
        } else if (field === 'ra') {
            this.formData.ra = value
            this.data.target.ra = parseFloat(value) || this.data.target.ra
        } else if (field === 'dec') {
            this.formData.dec = value
            this.data.target.dec = parseFloat(value) || this.data.target.dec
        } else if (field === 'latitude') {
            this.formData.latitude = value
            this.data.latitude = parseFloat(value) || this.data.latitude
        } else if (field === 'longitude') {
            this.formData.longitude = value
            this.data.longitude = parseFloat(value) || this.data.longitude
        } else if (field === 'timestamp') {
            this.formData.timestamp = value
            this.data.timestamp = value
        } else if (field === 'duration') {
            this.formData.duration = value
            this.data.duration = parseFloat(value) || this.data.duration
        } else if (field == 'wavelength') {
            this.formData.wavelength = value
            this.data.wavelength = parseFloat(value) || this.data.wavelength
        } else if (field == 'sky') {
            this.formData.sky = value
        }
        this.view.showFormData(this.formData)
    }

    onLoaded() {
        this.addAntennaClicked()
    }

    addAntennaClicked() {
        const newDish = JSON.parse(DEFAULT_DISH_JSON);
        const lastDishId =
            this.data.antennas.length > 0
                ? parseInt(this.data.antennas[this.data.antennas.length - 1].id)
                : 0;
        newDish.id = (lastDishId + 1).toString();
        this.data.antennas.push(newDish);
        this.view.showAntennas(this.data.antennas)
    }

    antennaClicked(bounds: AntennaBounds) {
        const antennaIndex = this.data.antennas
            .map((a: AntennaModel) => a.id === bounds.id)
            .indexOf(true);
        this.view.setFocusedAntenna(this.data.antennas[antennaIndex], bounds);
    }

    observeClicked() {
        this.view.setAnimating(true)
        this.view.setObserveButtonDisabled(true)
        const runner = new ObservationRunner(this.data)
        runner.run(this.formData.sky)
        .then(result => {
            this.view.showResult(result as ObservationResult)
        }).finally(() => {
            this.view.setAnimating(false)
            this.view.setObserveButtonDisabled(false)
        })
    }

    dishPropertiesDismissed(updated: AntennaModel, shouldDelete?: Boolean) {
        const antennaIndex = this.data.antennas
          .map((a: AntennaModel) => a.id === updated.id)
          .indexOf(true);
        if (shouldDelete) {
          this.data.antennas.splice(antennaIndex, 1);
        } else {
          this.data.antennas[antennaIndex] = updated;
        }
        this.view.setFocusedAntenna(undefined, undefined)
        this.view.showAntennas(this.data.antennas)
    }

    didChooseSavePath(path: string) {
        ObservationFileUtil
            .export(this.data, path)
            .then()
            .catch((reason) => console.log(reason))
    }

    didChooseOpenPath(path: string) {
        ObservationFileUtil
            .import(path)
            .then((data: Observation) => {
                this.data = data
                this.formData.size = ((data.antennas.length) ? data.antennas[0].size : 1).toString()
                this.formData.eta = ((data.antennas.length) ? data.antennas[0].eta : 1).toString()
                this.formData.ra = data.target.ra.toString()
                this.formData.dec = data.target.dec.toString()
                this.formData.duration = data.duration.toString()
                this.formData.latitude = data.latitude.toString()
                this.formData.longitude = data.longitude.toString()
                this.formData.timestamp = data.timestamp
                this.formData.wavelength = data.wavelength.toString()
                this.view.showFormData(this.formData)
                this.view.showAntennas(this.data.antennas)
            })
            .catch((reason) => console.log(reason))
    }

    didDismissResults() {
        this.view.dismissResult()
    }
}