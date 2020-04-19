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

const ANTENNA_MIN_SIZE = 64
const ANTENNA_MAX_SIZE = 512
const PERSPECTIVE = 0.4
const DEPTH = 10

interface AntennaVisualProps {
    antennas: AntennaModel[],
    width: number,
    height: number,
    animating: boolean,
    onClick: (bounds: AntennaBounds) => void
}
interface AntennaVisualState extends AntennaVisualProps {
    perspective: number,
    depth: number,
    scale: number, // units per pixel
    sideLength: number, // units per side
    antennaBounds: AntennaBounds[]
}

export class AntennaVisual extends React.Component<AntennaVisualProps, AntennaVisualState> {
    constructor(props: AntennaVisualProps) {
        super(props)
        const scale = AntennaVisual.calculateScale(props.width, props.height, PERSPECTIVE, props.antennas)
        this.state = {
            antennas: props.antennas,
            antennaBounds: props.antennas.map(a => AntennaVisual.mapAntennaToBounds(a, scale[0], PERSPECTIVE, props.width, props.height)),
            width: props.width,
            height: props.height,
            perspective: PERSPECTIVE,
            depth: DEPTH,
            scale: scale[0],
            sideLength: scale[1],
            animating: props.animating,
            onClick: props.onClick
        }
        this.clickHandler = this.clickHandler.bind(this)
        this.draw = this.draw.bind(this)
        
    }
    static projectPoint(x: number, y: number, width: number, height: number, slope: number, scale: number) {
        return { 
            x: width/2 + (x + y)*Math.sqrt(1 / (1 + slope*slope))*scale,
            y: height/2 - (x - y)*Math.sqrt(1 / (1 + 1 / (slope*slope)))*scale
        }
    }
    static mapAntennaToBounds(a: AntennaModel, scale: number, slope: number, width: number, height: number): AntennaBounds {
        const size = Math.min(ANTENNA_MAX_SIZE, Math.max(a.size * scale, ANTENNA_MIN_SIZE))
        const projected = AntennaVisual.projectPoint(a.x, a.y, width, height, slope, scale)
        return { 
            id: a.id,
            x: projected.x - size/2, 
            y: projected.y - size*0.8,
            w: size,
            h: size
        }
    }
    static calculateScale(
        width: number, 
        height: number, 
        perspective: number,
        antennas: AntennaModel[]
    ): number[] {
        const maxX = Math.max(...antennas.map(a => Math.abs(a.x)))
        const maxY = Math.max(...antennas.map(a => Math.abs(a.y)))
        const maxDim = Math.max(2.5, Math.ceil(Math.max(maxX, maxY) / 2.5) * 2.5)*2
        const dx = width/2
        const dy = width/2 * perspective
        const sideLength = Math.sqrt(dx*dx + dy*dy)
        const scale = sideLength / (maxDim || 1)
        return [scale, maxDim]
    }
    static getDerivedStateFromProps(nextProps: AntennaVisualProps, prevState: AntennaVisualState) {
        const scale = AntennaVisual.calculateScale(nextProps.width, nextProps.height, PERSPECTIVE, nextProps.antennas)
        return { 
            width: nextProps.width, 
            height: nextProps.height, 
            scale: scale[0],
            sideLength: scale[1],
            antennaBounds: nextProps.antennas.map(a => AntennaVisual.mapAntennaToBounds(a, scale[0], PERSPECTIVE, nextProps.width, nextProps.height)),
            antennas: nextProps.antennas,
            animating: nextProps.animating
        }
    }
    componentDidUpdate() {
        // redraw the canvas
        this.draw()
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
    draw() {
        const canvas = this.refs.canvas as HTMLCanvasElement
        if (canvas !== undefined) {
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = this.state.width
            canvas.height = this.state.height
            ctx.imageSmoothingEnabled = false
            ctx.clearRect(0, 0, this.state.width, this.state.height)
            this.drawGround(ctx)
            this.drawBaselines(ctx)
            this.drawAntennas(ctx)
            this.drawLabels(ctx)
        }
        if (this.state.animating) {
            requestAnimationFrame(this.draw)
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

        ctx.strokeStyle = '#55cc55'
        ctx.fillStyle = ctx.strokeStyle
        const slope = this.state.perspective
        const scale = this.state.scale
        const width = this.state.width
        const height = this.state.height
        const tickLength = Math.pow(10, Math.max(0, Math.floor(Math.log10(this.state.sideLength/2)-1)))
        const tickStart = -tickLength * Math.floor(this.state.sideLength/tickLength/2)
        ctx.beginPath()
        ctx.ellipse(width/2, height/2, 10, slope*10, 0, 0, 2*Math.PI)
        ctx.fill()
        for (let i = tickStart; i <= this.state.sideLength/2; i+=tickLength) {
            const start = AntennaVisual.projectPoint(
                i, 
                -this.state.sideLength/2, 
                width, height, slope, scale
            )
            const end = AntennaVisual.projectPoint(
                i, 
                this.state.sideLength/2, 
                width, height, slope, scale
            )
            const startH = AntennaVisual.projectPoint(
                -this.state.sideLength/2, 
                i , 
                width, height, slope, scale
            )
            const endH = AntennaVisual.projectPoint(
                this.state.sideLength/2, 
                i, 
                width, height, slope, scale
            )
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.moveTo(startH.x, startH.y)
            ctx.lineTo(endH.x, endH.y)
        }
        ctx.stroke()

    }
    drawBaselines(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = '#040'
        ctx.lineWidth = 1
        const points = this.state.antennas.map( (a: AntennaModel) => {
            return AntennaVisual.projectPoint(a.x, a.y, this.state.width, this.state.height, this.state.perspective, this.state.scale)
        })
        ctx.beginPath()
        points.forEach((p) => {
            points.forEach((end) => {
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(end.x, end.y)
            })
        })
        ctx.stroke()
    }
    drawAntennas(ctx: CanvasRenderingContext2D) {
        this.state.antennaBounds
            .sort((a,b) => a.y - b.y)
            .map((a: AntennaBounds) => this.drawAntenna(ctx, a))
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
        if (this.state.animating) {
            const radius = 80
            const angle = Math.PI / 4
            const spacing = 40
            const offset = Date.now() % 1000 / 1000.0;
            ctx.strokeStyle = '#00f'
            ctx.beginPath();
            ctx.lineWidth = 2;
            for (let i = 4*spacing*(offset - 1); i < bounds.y+bounds.h/4; i+=spacing) {
                ctx.beginPath()
                ctx.strokeStyle = 'rgba(0,0,255,' + Math.min(1, i/bounds.y) + ')'
                ctx.arc(bounds.x + bounds.w/2, i - radius, radius, Math.PI/2 - angle/2, Math.PI/2 + angle/2)
                ctx.stroke()
            }
            ctx.stroke();
        }
        
    }
    drawLabels(ctx: CanvasRenderingContext2D) {
        const labelOffset = 30
        const start = [
            this.state.width/2,
            this.state.height/2 + this.state.width * this.state.perspective/2 + DEPTH + labelOffset
        ]
        const end = [
            this.state.width,
            this.state.height/2 + DEPTH + labelOffset
        ]
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(start[0], start[1])
        ctx.lineTo(end[0], end[1])
        ctx.moveTo(start[0], start[1]-10)
        ctx.lineTo(start[0], start[1]+10)
        ctx.moveTo(end[0]-1, end[1]-10)
        ctx.lineTo(end[0]-1, end[1]+10)
        ctx.stroke()
        ctx.font = "20px 'Nunito'"
        const textX = this.state.width/2 + this.state.width/2 * 0.5
        const textY = this.state.height/2 + this.state.width * this.state.perspective/2 + DEPTH + labelOffset - this.state.width * this.state.perspective/2 * 0.5
        const text = this.state.sideLength + ' m'
        const dim = ctx.measureText(text)
        ctx.fillStyle = '#ccc'
        ctx.clearRect(textX - dim.width/2 - 5, textY - 10, dim.width + 10, 30)
        ctx.fillText(text, textX - dim.width/2, textY + 10)
    }
    render() {
        return (<>
            <canvas ref="canvas"></canvas>
            <img ref={'antennaimg'} src={antenna} style={{display: 'none'}}/>
        </>)
    }
}