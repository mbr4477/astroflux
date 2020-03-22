import * as React from 'react';
import { AntennaVisual, AntennaBounds } from './AntennaVisual'
import './home.css'
import AntennaModel from '../../model/AntennaModel';

class Home extends React.Component<any, any> {
    constructor(props: any) {
        super(props)
        this.state = {
            width: 0,
            height: 0
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
                antennas={[{ id: 'first', x: 0, y: 0, scale: 1.0 }]} 
                width={this.state.width*0.75} 
                height={this.state.height*0.75}
                onClick={(bounds: AntennaBounds) => {
                    console.log(bounds.id)
                }}/> 
            <div>
                <button>Add Antenna</button>                    
            </div>
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