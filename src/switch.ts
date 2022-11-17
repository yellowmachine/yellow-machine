///
import { Data, type SETUP } from '.';
type SWF = (data: any)=>number;

export default (f: SWF) => (setup: SETUP) => async (data: Data) => {
    const pipes = setup["multiple"];
    const pipe = pipes[f(data)];
    return await pipe(data);    
};
