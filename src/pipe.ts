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
    
    const pipe = (tasks: (FD|AsyncGenerator|Generator)[]) => async (data: Data) => {
        
        if(data.data === null) return null;
        
        let close;
        if(data.ctx) close = data.ctx.close;

        try{
            for(const t of tasks){
                try{
                    const m = t;
                    if(typeof m === 'function'){
                        data.data = await m(data);
                    }else{
                        const response = await m.next(data);
                        data.data = response.value;
                        if(dev) log(path, response.value); //path.v = path.v + "," + response.value;
                        if(response.done && close) close(false, response.value);                                                            
                    }
                }catch(err){
                    if(err instanceof Error && !err.message.startsWith("?")) throw err;
                    data.data = null;
                    continue;
                }
            }
            return data.data;
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            if(close) close(true);
            //if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            if(dev && err instanceof Error && !err.message.startsWith("no log")){
                const msg = err instanceof Error? err.message: "unknown error";
                log(path, msg);
            } 
            //if(tasks.at(-1) === '?' || question) throw new Error('?');
            if(err instanceof Error && (err.message.startsWith("throw") || err.message.endsWith("!")))
                throw new Error('no log:' + err.message);
            else
                throw err;
            //return null;
        }
    };

    return pipe;
};
