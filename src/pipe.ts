import { Data, DEBUG, type Namespace, type F } from ".";

export type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Pipe = (tasks: F|Tpipe) => (data: Data) => Promise<any>;
export type PipeArray = Tpipe[];

export default (namespace: Namespace, dev: boolean, path: string[]) => {
    
    const pipe = (tasks: F|Tpipe) => async (data: Data) => {
        if(data.data === null) return null;
        
        let close;
        if(data.ctx) close = data.ctx.close;

        if(!Array.isArray(tasks)){
            tasks = [tasks];
        }
        const throws = true;
        let question = false;
        try{
            for(const t of tasks){
                question = false;
                try{
                    /*let m: C;
                    if(typeof t === 'string'){
                        if( t === '?') continue;
                        if(t.charAt(t.length-1) === "?"){
                            question = true;
                            t = t.substring(0, t.length-1);
                        }
                        m = namespace[t];
                        if(m === undefined) throw new Error("Key Error: namespace error: " + t + ",(it could be a missing plugin)");
                    }else{
                        m = t;
                    }*/
                    if(typeof t === 'string'){
                        continue;
                    }
                    const m = t;
                    if(typeof m === 'function'){
                        data.data = await m(data);
                    }else if(Array.isArray(m)){
                        await pipe(m)(data);
                    }else{
                        const response = await m.next(data);
                        data.data = response.value;
                        if(dev) path.push(response.value);
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
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            if(dev && err instanceof Error && !err.message.startsWith("no log")){
                path.push(err instanceof Error? err.message: "unknown error");
            } 
            if(tasks.at(-1) === '?' || question) throw new Error('?');
            if(throws){
                if(err instanceof Error && (err.message.startsWith("throw") || err.message.endsWith("!")))
                    throw new Error('no log:' + err.message);
                else
                    throw err;
            }
            return null;
        }
    };

    return pipe;
};
