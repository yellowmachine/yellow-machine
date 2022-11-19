import { Data, type SETUP } from '.';
type SWF = (data: any)=>number|boolean;

export default (f: SWF) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];
    const pipes = setup["multiple"];

    const v = f(data);
    if(typeof v === 'boolean'){
        if(v) return await pipe(data);
        else return null;
    }else{
        return await pipes[v](data); 
    }
};
