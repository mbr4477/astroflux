import Observation from "../model/Observation"
import { exec } from 'child_process'
import { join } from 'path'
import { remote } from 'electron'

const PYTHON_FILE = join(
    remote.app.getAppPath(), 
    'python',
    'astroflux.py')

class ObservationRunner {
    observation: Observation
    constructor(data: Observation) {
        this.observation = data
    }
    run(skyOpt: string) {
        // stringify the JSON
        return new Promise((res, rej) => {
            const stringData = JSON.stringify(this.observation)
            exec(`conda run -n base python ${PYTHON_FILE} --json='${stringData}' --sky=${skyOpt} --fast --dump`, (err, stdout, stderr) => {
                if (err) {
                    console.log(err)
                    rej(err)
                    return
                }
                if (stderr) {
                    console.log(stderr)
                    rej(stderr)
                    return
                }
                console.log(stdout)
                const result = JSON.parse(stdout)
                res(result)
            })
        })
    }
}

export default ObservationRunner