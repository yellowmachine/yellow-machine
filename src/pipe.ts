import { Data, DEBUG, type Namespace, type F, type FD } from ".";

export type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Pipe = (tasks: F|Tpipe) => (data: Data) => Promise<any>;
export type PipeArray = Tpipe[];

const log = (path: {v: string}, msg: string) => {
    if(path.v === '') path.v = msg;
    else{
        const aux = path.v.split(',');
        aux.push(msg);
        path.v = aux.join(',');
    }
    
};


export default (dev: boolean, path: {v: string}) => {
    
    const pipe = (tasks: FD[]) => async (data: Data) => {
        
        if(data.data === null) return null;
        
        let close;
        if(data.ctx) close = data.ctx.close;

        try{
            for(const m of tasks){
                data.data = await m(data);
                if(dev) log(path, data.data);
                if(data.data === null && close) close(false);
                /*if(typeof m === 'function'){
                    data.data = await m(data);
                }else{
                    const response = await m.next(data);
                    data.data = response.value;
                    if(dev) log(path, response.value);
                    if(response.done && close) close(false, response.value);                                                            
                }*/
            }
            return data.data;
        }catch(err){
            //data.data = null;
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            if(close) close(true);
            if(dev && err instanceof Error && !err.message.startsWith("no log")){
                const msg = err instanceof Error? err.message: "unknown error";
                log(path, msg);
            } 
            if(err instanceof Error && (err.message.startsWith("throw") || err.message.endsWith("!")))
                throw new Error('no log:' + err.message);
            else
                throw err;
        }
    };

    return pipe;
};
