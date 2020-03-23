import * as React from 'react';
import { AntennaVisual, AntennaBounds } from './AntennaVisual'
import './home.css'
import AntennaModel from '../../model/AntennaModel';
import DishProperties from './DishProperties';
import DishAntenna from '../../model/DishAntenna';

const DEFAULT_DISH_JSON = JSON.stringify({ id: '0', x: 0, y: 0, scale: 1.0, diameter: 3.0, wavelength: 0.21, bandwidth: 100e6, eta: 0.5 })

class Home extends React.Component<any, any> {
    constructor(props: any) {
        super(props)
        this.state = {
            antennas: [],
            width: 0,
            height: 0,
            focusedAntenna: undefined,
            focusedAntennaBounds: undefined
        }
        this.updateWindowDims = this.updateWindowDims.bind(this)
    }
    componentDidMount() {
        this.updateWindowDims()
        window.addEventListener('resize', this.updateWindowDims)
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDims)
    }
    render() {
        return (<div style={{
            textAlign: 'center'
            }}>
            <AntennaVisual 
                antennas={this.state.antennas} 
                width={this.state.width*0.75} 
                height={this.state.height*0.75}
                onClick={(bounds: AntennaBounds) => {
                    const antennaIndex = this.state.antennas.map((a: AntennaModel) => a.id === bounds.id).indexOf(true)
                    this.setState({ focusedAntennaBounds: bounds, focusedAntenna: this.state.antennas[antennaIndex] })
                }}/> 
            <div>
                <button onClick={() => {
                    const existing = this.state.antennas.slice()
                    const newDish = JSON.parse(DEFAULT_DISH_JSON)
                    const lastDishId = (existing.length > 0) ? parseInt(existing[existing.length - 1].id) : 0
                    newDish.id = (lastDishId + 1).toString()
                    existing.push(newDish)
                    this.setState({ antennas: existing })
                }}>Add Antenna</button>                    
            </div>
            {
                (this.state.focusedAntenna && this.state.focusedAntennaBounds) ? 
                    <DishProperties 
                        x={this.state.focusedAntennaBounds.x} 
                        y={this.state.focusedAntennaBounds.y} 
                        offsetX={(this.state.focusedAntennaBounds.x > this.state.width - 305) ? -260 : 80} 
                        offsetY={0}
                        dish={this.state.focusedAntenna}
                        onDismiss={ (updated: DishAntenna, shouldDelete?: Boolean) => {
                            const antennaIndex = this.state.antennas.map((a: AntennaModel) => a.id === updated.id).indexOf(true)
                            const currentAntennas = this.state.antennas.slice()
                            if (shouldDelete) {
                                currentAntennas.splice(antennaIndex,1)
                            } else {
                                currentAntennas[antennaIndex] = updated
                            }

                            this.setState({ focusedAntenna: undefined, focusedAntennaBounds: undefined, antennas: currentAntennas })
                        }} /> : undefined
            }
        </div>)
    }
    updateWindowDims() {
        this.setState({
            width: window.innerWidth,
            height: window.innerHeight
        })
    }
}

export default Home;