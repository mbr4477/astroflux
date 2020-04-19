import * as React from 'react'
import AntennaModel from '../../model/AntennaModel'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './AntennaEditor.css'

interface AntennaEditorProps {
    dish: AntennaModel,
    x: number, 
    y: number,
    offsetX: number,
    offsetY: number,
    hidden?: boolean,
    onDismiss: (updated: DishAntenna, shouldDelete?: boolean) => void
}

const AntennaEditor: React.FC<AntennaEditorProps> = (props: AntennaEditorProps) => {
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

export default AntennaEditor