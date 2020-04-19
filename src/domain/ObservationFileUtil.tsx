import Observation from "../model/Observation";
import { promises as fs } from 'fs';

class ObservationFileUtil {
    static export(obs: Observation, path: string) {
        const jsonString = JSON.stringify(obs, null, 2)
        return fs.writeFile(path, jsonString)
    }
    static async import(path: string) {
        const data = await fs.readFile(path);
        return JSON.parse(data.toString());
    }
}

export default ObservationFileUtil