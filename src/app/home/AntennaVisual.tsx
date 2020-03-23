import * as React from 'react';
import AntennaModel from '../../model/AntennaModel';
import antenna from '../../../images/antenna.png';

export interface AntennaBounds {
    id: string,
    x: number,
    y: number,
    w: number,
    h: number
}

const ANTENNA_BASE_SIZE = 64
const PERSPECTIVE = 0.4

interface AntennaVisualProps {
    antennas: AntennaModel[],
    width: number,
    height: number,
    onClick: (bounds: AntennaBounds) => void
}
interface AntennaVisualState extends AntennaVisualProps {
    perspective: number,
    depth: number,
    scale: number, // units per pixel
    antennaBounds: AntennaBounds[]
}

export class AntennaVisual extends React.Component<AntennaVisualProps, AntennaVisualState> {
    constructor(props: AntennaVisualProps) {
        super(props)
        const scale = AntennaVisual.calculateScale(props.width, props.height, PERSPECTIVE, props.antennas)
        this.state = {
            antennas: props.antennas,
            antennaBounds: props.antennas.map(a => AntennaVisual.mapAntennaToBounds(a, scale, PERSPECTIVE, props.width, props.height)),
            width: props.width,
            height: props.height,
            perspective: PERSPECTIVE,
            depth: 10,
            scale: scale,
            onClick: props.onClick
        }
        this.clickHandler = this.clickHandler.bind(this)
    }
    static mapAntennaToBounds(a: AntennaModel, scale: number, slope: number, width: number, height: number): AntennaBounds {
        const size = ANTENNA_BASE_SIZE * a.scale
        return { 
            id: a.id,
            x: width/2 + (a.x + a.y)*Math.sqrt(1 / (1 + slope*slope))*scale - size/2, 
            y: height/2 - (a.x - a.y)*Math.sqrt(1 / (1 + 1 / (slope*slope)))*scale - size*0.8,
            w: size,
            h: size
        }
    }
    static calculateScale(
        width: number, 
        height: number, 
        perspective: number,
        antennas: AntennaModel[]
    ): number {
        const maxX = Math.max(...antennas.map(a => Math.abs(a.x)))
        const maxY = Math.max(...antennas.map(a => Math.abs(a.y)))
        const maxDim = Math.max(maxX, maxY)
        const dx = width/2
        const dy = width/2 * perspective
        const sideLength = Math.sqrt(dx*dx + dy*dy)
        return sideLength / (maxDim | 1) * 0.4
    }
    static getDerivedStateFromProps(nextProps: AntennaVisualProps, prevState: AntennaVisualState) {
        if (nextProps.width !== prevState.width || nextProps.height !== prevState.height || nextProps.antennas !== prevState.antennas) {
            const scale = AntennaVisual.calculateScale(nextProps.width, nextProps.height, PERSPECTIVE, nextProps.antennas)
            return { 
                width: nextProps.width, 
                height: nextProps.height, 
                scale: scale,
                antennaBounds: nextProps.antennas.map(a => AntennaVisual.mapAntennaToBounds(a, scale, PERSPECTIVE, nextProps.width, nextProps.height)),
                antennas: nextProps.antennas
            }
        } else return null
    }
    componentDidUpdate() {
        // redraw the canvas
        const canvas = this.refs.canvas as HTMLCanvasElement
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        canvas.width = this.state.width
        canvas.height = this.state.height
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, this.state.width, this.state.height)
        this.drawGround(ctx)
        this.drawAntennas(ctx)
    }
    componentDidMount() {
        (this.refs.canvas as HTMLCanvasElement).addEventListener('click', this.clickHandler)
    }
    componentWillUnmount() {
        (this.refs.canvas as HTMLCanvasElement).removeEventListener('click', this.clickHandler)
    }
    clickHandler(e: any) {
        const localX = e.offsetX
        const localY = e.offsetY
        const clickedIndex = this.state.antennaBounds.map(b => (
            localX > b.x && localX < b.x + b.w && localY > b.y && localY < b.y + b.h
        )).indexOf(true)
        if (clickedIndex >= 0) {
            const bounds = this.state.antennaBounds[clickedIndex]
            const clientBounds = {
                id: bounds.id,
                x: bounds.x + (e.x - e.offsetX),
                y: bounds.y + (e.y - e.offsetY),
                w: bounds.w,
                h: bounds.h
            }
            if (this.state.onClick) this.state.onClick(clientBounds)
        }
    }
    drawGround(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = '#804000'
        ctx.beginPath()
        ctx.moveTo(0, this.state.height/2)
        ctx.lineTo(this.state.width, this.state.height/2)
        ctx.lineTo(this.state.width, this.state.height/2 + this.state.depth)
        ctx.lineTo(this.state.width/2, this.state.height/2 + this.state.width * this.state.perspective/2 + this.state.depth)
        ctx.lineTo(0, this.state.height/2 + this.state.depth)
        ctx.fill()

        ctx.fillStyle = '#22bb22'
        ctx.beginPath()
        ctx.moveTo(0, this.state.height/2)
        ctx.lineTo(this.state.width/2, this.state.height/2 - this.state.width * this.state.perspective/2)
        ctx.lineTo(this.state.width, this.state.height/2)
        ctx.lineTo(this.state.width/2, this.state.height/2 + this.state.width * this.state.perspective/2)
        ctx.fill()
    }
    drawAntennas(ctx: CanvasRenderingContext2D) {
        this.state.antennaBounds.map((a: AntennaBounds) => this.drawAntenna(ctx, a))
    }
    drawAntenna(ctx: CanvasRenderingContext2D, bounds: AntennaBounds)  {
        const image = this.refs.antennaimg as HTMLImageElement
        ctx.drawImage(
            image, 
            bounds.x,
            bounds.y,
            bounds.w,
            bounds.h
        )
    }
    render() {
        return (<>
            <canvas ref="canvas"></canvas>
            <img ref={'antennaimg'} src={antenna} style={{display: 'none'}}/>
        </>)
    }
}