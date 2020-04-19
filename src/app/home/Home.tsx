import * as React from "react";
import { AntennaVisual, AntennaBounds } from "./AntennaVisual";
import "./home.css";
import AntennaModel from "../../model/AntennaModel";
import AntennaEditor from "./AntennaEditor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IHomeView, HomePresenter, ObsFormData } from "./HomePresenter";
import {
    faPlus,
    faSave,
    faSatelliteDish,
    faFolderOpen as faOpen,
} from "@fortawesome/free-solid-svg-icons";
import Observation from "../../model/Observation";
import { remote as electron } from "electron";
import ResultModal from "./ResultModal/ResultModal";
import ObservationResult from "../../model/ObservationResult";

class Home extends React.Component<any, any> implements IHomeView {
    presenter: HomePresenter;
    constructor(props: any) {
        super(props)
        this.presenter = new HomePresenter(this)
        console.log(this.presenter.data)
        this.state = {
            formData: this.presenter.formData,
            antennas: this.presenter.data.antennas,
            width: 0,
            height: 0,
            focusedAntenna: undefined,
            focusedAntennaBounds: undefined,
            animating: false,
            observeDisabled: false,
            resultModalData: undefined
        };
        this.updateWindowDims = this.updateWindowDims.bind(this);
    }
    showFormData(formData: ObsFormData) {
        this.setState({ formData })
    }
    showAntennas(antennas: AntennaModel[]) {
        this.setState({ antennas });
    }
    setAnimating(animating: boolean) {
        this.setState({ animating });
    }
    setObserveButtonDisabled(disabled: boolean) {
        this.setState({ observedDisabled: disabled })
    }
    setFocusedAntenna(
        focusedAntenna: AntennaModel,
        focusedAntennaBounds: AntennaBounds
    ) {
        this.setState({ focusedAntenna, focusedAntennaBounds });
    }
    showResult(result: ObservationResult) {
        this.setState({ resultModalData: result })
    }
    dismissResult() {
        this.setState({ resultModalData: undefined })
    }
    componentDidMount() {
        this.updateWindowDims();
        window.addEventListener("resize", this.updateWindowDims);
        this.presenter.onLoaded();
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.updateWindowDims);
    }
    render() {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <div style={{ flex: "1 0" }}></div>
                <div style={{ flex: "0 0" }}>
                    <AntennaVisual
                        antennas={this.state.antennas}
                        width={this.state.width * 0.75}
                        height={this.state.height * 0.7}
                        animating={this.state.animating}
                        onClick={(bounds: AntennaBounds) =>
                            this.presenter.antennaClicked(bounds)
                        }
                    />
                </div>
                <div style={{ flex: "1 0" }}></div>
                <div className='obs-inputs'>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='size'>Antenna Size (m)</label>
                        <input id='size' type='text' value={this.state.formData.size} placeholder='meters' onChange={(e) => this.presenter.updateObservation('size', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='eta'>Efficiency</label>
                        <input id='eta' type='text' value={this.state.formData.eta} placeholder='' onChange={(e) => this.presenter.updateObservation('eta', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='ra'>Right Ascension (RA)</label>
                        <input id='ra' type='text' value={this.state.formData.ra} placeholder='hh:mm:ss.sss' onChange={(e) => this.presenter.updateObservation('ra', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='dec'>Declination (DEC)</label>
                        <input id='dec' type='text' value={this.state.formData.dec} placeholder='dd.ddddd&deg;' onChange={(e) => this.presenter.updateObservation('dec', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='duration'>Duration (hours)</label>
                        <input id='duration' type='text' value={this.state.formData.duration} onChange={(e) => this.presenter.updateObservation('duration', e.target.value)} />
                    </div>
                    <div className='flex-break'/>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='latitude'>Latitude</label>
                        <input id='latitude' type='text' value={this.state.formData.latitude} placeholder={'Latitude'} onChange={(e) => this.presenter.updateObservation('latitude', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='longitude'>Longitude</label>
                        <input id='longitude' type='text' value={this.state.formData.longitude} placeholder={'Longitude'} onChange={(e) => this.presenter.updateObservation('longitude', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='wavlength'>Wavelength (m)</label>
                        <input id='wavelength' type='text' value={this.state.formData.wavelength} placeholder={'Wavelength'} onChange={(e) => this.presenter.updateObservation('wavelength', e.target.value)} />
                    </div>
                    <div className='stacked'>
                        <label className='input-label' htmlFor='timestamp'>Timestamp</label>
                        <input id='timestamp' type='datetime-local' value={this.state.formData.timestamp}  onChange={(e) => this.presenter.updateObservation('timestamp', e.target.value)} />
                    </div>
                </div>
                <div
                    style={{
                        flex: "0 0",
                        marginBottom: 20,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                        width: "100vw",
                    }}
                >
                    <div>
                        <button style={{ border: "none" }} onClick={() => {
                            electron.dialog.showSaveDialog({
                                title: 'Save Observation',
                                filters: HomePresenter.FILEFILTERS
                            }, (name) => {
                                if (name !== undefined) {
                                    this.presenter.didChooseSavePath(name)
                                }
                            })
                        }}>
                            <FontAwesomeIcon icon={faSave} />
                        </button>
                        <button style={{ border: "none" }} onClick={() => {
                            electron.dialog.showOpenDialog({
                                filters: HomePresenter.FILEFILTERS
                            }, (names) => {
                                if (names !== undefined) {
                                    this.presenter.didChooseOpenPath(names[0])
                                }
                            })
                        }}>
                            <FontAwesomeIcon icon={faOpen} />
                        </button>
                    </div>
                    <select className='sky-select' onChange={(e) => this.presenter.updateObservation('sky', e.target.value)}>
                        {
                            this.state.formData.skyOptions.map(opt => <option value={opt.value}>{opt.title}</option>)
                        }
                    </select>
                    <button onClick={() => this.presenter.observeClicked()} disabled={this.state.observedDisabled}>
                        <FontAwesomeIcon icon={faSatelliteDish} /> {' Observe'}
                    </button>
                    <button onClick={() => this.presenter.addAntennaClicked()}>
                        <FontAwesomeIcon icon={faPlus} /> {' Antenna'}
                    </button>
                </div>
                {this.state.focusedAntenna && this.state.focusedAntennaBounds ? (
                    <AntennaEditor
                        x={this.state.focusedAntennaBounds.x}
                        y={this.state.focusedAntennaBounds.y}
                        offsetX={
                            this.state.focusedAntennaBounds.x > this.state.width - 305
                                ? -260
                                : 80
                        }
                        offsetY={0}
                        dish={this.state.focusedAntenna}
                        onDismiss={(updated: AntennaModel, shouldDelete?: boolean) =>
                            this.presenter.dishPropertiesDismissed(updated, shouldDelete)
                        }
                    />
                ) : undefined}
                {
                    (this.state.resultModalData) ? <ResultModal 
                        result={this.state.resultModalData}
                        onDismiss={() => this.presenter.didDismissResults()}/> : undefined
                }
            </div>
        );
    }
    updateWindowDims() {
        this.setState({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }
}

export default Home;
