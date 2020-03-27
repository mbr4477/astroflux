import * as React from 'react'
import DishAntenna from '../../model/DishAntenna'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './dishproperties.css'

interface DishPropertiesProps {
    dish: DishAntenna,
    x: number, 
    y: number,
    offsetX: number,
    offsetY: number,
    hidden?: boolean,
    onDismiss: (updated: DishAntenna, shouldDelete?: boolean) => void
}

const DishProperties: React.FC<DishPropertiesProps> = (props: DishPropertiesProps) => {
    const dish = JSON.parse(JSON.stringify(props.dish))
    if (dish === undefined) {
        return <i></i>
    }
    return <div style={{
        padding: '25px 10px 10px 10px',
        borderRadius: 10,
        position: 'absolute',
        top: props.y + props.offsetY,
        left: props.x + props.offsetX,
        display: (props.hidden) ? 'none' : 'inline-block',
        background: 'white',
        boxShadow: 'rgba(0,0,0,0.5) 0px 0px 5px',
        width: 225
    }}>
        <FontAwesomeIcon icon={faTimes} style={{ position: 'absolute', top: 4, right: 6, color: 'black' } } onClick={() => props.onDismiss(props.dish)}/>
        <table className='dishprops'>
            <tbody>
                <tr><td>X (m)</td><td><input type='text' defaultValue={dish.x} onChange={(e) => dish.x = parseFloat(e.target.value) || 0}/></td></tr>
                <tr><td>Y (m)</td><td><input type='text' defaultValue={dish.y} onChange={(e) => dish.y = parseFloat(e.target.value) || 0}/></td></tr>
                <tr><td>Diameter (m)</td><td><input type='text' defaultValue={dish.size} onChange={(e) => dish.size = parseFloat(e.target.value) || 0}/></td></tr>
                <tr><td>Wavelength (m)</td><td><input type='text' defaultValue={dish.wavelength} onChange={(e) => dish.wavelength = parseFloat(e.target.value) || 0}/></td></tr>
                <tr><td>Bandwidth (Hz)</td><td><input type='text' defaultValue={dish.bandwidth} onChange={(e) => dish.bandwidth = parseFloat(e.target.value) || 0}/></td></tr>
                <tr><td>Sampling Rate (Hz)</td><td><input type='text' defaultValue={dish.samplingRate} onChange={(e) => dish.samplingRate = parseFloat(e.target.value) || dish.samplingRate}/></td></tr>
                <tr><td>Efficiency</td><td><input type='text' defaultValue={dish.eta} onChange={(e) => dish.eta = parseFloat(e.target.value) || dish.eta}/></td></tr>
            </tbody>
        </table>
        <button 
            className='btn-destructive'
            style={{
                padding: '2px 20px',
                marginTop: '10px',
                marginRight: '10px'
            }} 
            onClick={() => {
                props.onDismiss(dish, true)
            }}>Delete</button>
        <button style={{
            padding: '2px 20px',
            marginTop: '10px'
        }} onClick={() => {
            props.onDismiss(dish)
        }}>Save</button>
    </div>
}

export default DishProperties