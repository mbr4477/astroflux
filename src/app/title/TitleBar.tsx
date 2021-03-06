import * as React from 'react';
import './titlebar.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { remote } from 'electron'

const TitleBar: React.FC<any> = (props) => {
    return <div 
        className='titlebar-bar'
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '20px',
            textAlign: 'center',
            paddingTop: 4
        }}>
            <span className='titlebar-title' style={{
                color: 'black',
            }}>{props.title}</span>
            <FontAwesomeIcon icon={faTimes} style={{ 
                color: '#ff3333', padding: '2px 4px', position: 'absolute', top: 2, right: 2
                }}/>
            <a 
                className={'titlebar-close'}
                onClick={() => {
                    remote.getCurrentWindow().close()
                }}>
            </a>
    </div>
}

export default TitleBar;