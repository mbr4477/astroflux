import * as React from 'react'
import ObservationResult from '../../../model/ObservationResult'
import './ResultModal.css'
import { join } from 'path'
import { promises as fs } from 'fs'
import { render } from 'react-dom'

interface ResultModalProps {
    result: ObservationResult
    onDismiss: () => void
}

class ResultModal extends React.Component<ResultModalProps, any> {
    constructor(props: ResultModalProps) {
        super(props)
        this.state = {
            skyImage: '',
            cleanImage: '',
            dirtyImage: '',
            dirtyBeamImage: '',
            uvPlotImage: '',
            onDismiss: props.onDismiss
        }
        fs.readFile(props.result.skyPath).then((data) => {
            this.setState({ skyImage: data.toString('base64') })
        })
        fs.readFile(props.result.cleanPath).then((data) => {
            this.setState({ cleanImage: data.toString('base64') })
        })
        fs.readFile(props.result.dirtyImagePath).then((data) => {
            this.setState({ dirtyImage: data.toString('base64') })
        })
        fs.readFile(props.result.dirtyBeamPath).then((data) => {
            this.setState({ dirtyBeamImage: data.toString('base64') })
        })
        fs.readFile(props.result.uvPath).then((data) => {
            this.setState({ uvPlotImage: data.toString('base64') })
        })
    }
    render() {
        return <div className='result-modal--container'>
            <div className='result-modal--content'>
                <div className='result-modal--content--scroll'>
                    <div>
                        <img src={`data:image/jpeg;base64,${this.state.uvPlotImage}`}/>
                        <img src={`data:image/jpeg;base64,${this.state.dirtyBeamImage}`}/>
                    </div>
                    <div>
                        <img src={`data:image/jpeg;base64,${this.state.skyImage}`}/>
                    </div>
                    <div>
                        <img src={`data:image/jpeg;base64,${this.state.dirtyImage}`}/>
                        <img src={`data:image/jpeg;base64,${this.state.cleanImage}`}/>
                    </div>
                </div>
                <button className='dismiss-button' onClick={() => this.state.onDismiss() }>Done</button> 
            </div>
        </div>
    }
}

export default ResultModal