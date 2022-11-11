import { watch as chwatch } from 'chokidar';
import { emitKeypressEvents } from 'node:readline';

emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

export function *g(arr: string[]){
    for(const i of arr){
        if(i === 'throw') throw new Error(i);
        else yield i;
    }
}

export const DEBUG = {v: false};
export const SHOW_QUIT_MESSAGE = {v: false};

export type Data = {data?: any, ctx: {quit: ()=>void}};
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Serial = (tasks: Tpipe|C, ctx?: any) => Promise<any>;
export type Parallel = (tasks: Tpipe|C, mode?: "all"|"race"|"allSettled", ctx?: any) => Promise<any>;

export const dev = (path: string[]) => (namespace: Record<string, Generator|AsyncGenerator|((arg0: Data)=>any)>) => context(namespace, true, path);

export function context(namespace: Record<string, Generator|AsyncGenerator|((arg0: Data)=>any)> = {}, dev=false, path: string[]=[]){

    function nr(f: F|Tpipe){
        let exited = true;
        return async function(data: Data){
            if(exited){
                try{
                    exited = false;
                    return await serial(f, data.ctx);
                }catch(err){
                    if(DEBUG.v)
                        // eslint-disable-next-line no-console
                        console.log(err);
                    throw(err);
                }finally{
                    exited = true;
                }
            }
        };
    }

    function w(files: string[],f: Tpipe|F){
        return () => watch(files, f);
    }

    function watch(files: string[], f: Tpipe|F){
        const q = 'q';

        const h = (ch: string) => {
            if(ch === q){
                close();
            }
        };
        process.stdin.on('keypress', h);        

        let resolve: (null|((arg0: (any)) => void)) = null;
        let reject: (null|(() => void)) = null;

        const p = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        let exited = false;
        function close(err = false, data = null){
            if(!exited){
                exited = true;
                process.stdin.pause();
                process.stdin.removeListener("keypress", h);
                if(err){
                    if(reject) reject();
                }
                else if(resolve) resolve(data);
                if(watcher)
                    watcher.close();
            }
        }

        async function exitedRun(f: Tpipe|F){
            while(!exited){   
                await run(f);
            }
        }

        async function run(f: Tpipe|F){
            try{
                if(typeof f === 'function')
                    await serial([f, 'throws'], {quit: close});
                else{
                    await serial(f, {quit: close});
                }                
                if(SHOW_QUIT_MESSAGE.v)
                    // eslint-disable-next-line no-console
                    console.log("Press " + q + " to quit!");
            }catch(err){
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
            }
        }

        let watcher: null | ReturnType<typeof chwatch> = null;
        if(!dev){
            watcher = chwatch(files, {ignoreInitial: true}).
                on('all', (event, path) => {
                    // eslint-disable-next-line no-console
                    //console.log(event, path);
                    run(f);
                });
            run(f);
        }else{
            exitedRun(f);
        }
        return p;
    }

    const parallel: Parallel = async (tasks, mode="all", ctx=null) =>{
        const promises: Promise<any>[] = [];   

        const data = {
            data: null,
            ctx: ctx  || {}
        };

        let quit;
        if(ctx) quit = ctx.quit;
    
        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }

        for(const t of tasks){
            if(typeof t === 'function'){
                promises.push(t({...data}));
            }else if(Array.isArray(t)){
                promises.push(serial(t, {...data}));
            }else if(typeof t === 'string'){
                const m = namespace[t];
                if(typeof m === 'function'){
                    promises.push(m({...data}));
                }else{
                    try{
                        const x = await m.next(data);
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit(false, x.value);
                    }catch(err){
                        if(DEBUG.v)
                            // eslint-disable-next-line no-console
                            console.log(err);
                        if(dev) path.push('throws');
                        if(quit) quit(true);
                    }                    
                }
            }else{
                try{
                    const x = await t.next(data);
                    if(dev) path.push(x.value);
                    if(x.done && quit) quit(false, x.value);
                }catch(err){
                    if(DEBUG.v)
                        // eslint-disable-next-line no-console
                        console.log(err);
                    if(dev) path.push('throws');
                    if(quit) quit(true);
                }                
            } 
        }
        try{
            if(mode === "all") await Promise.all(promises);
            //else if (mode === "any") await Promise.any(promises);
            else if (mode === "race") await Promise.race(promises);
            else if (mode === "allSettled") await Promise.allSettled(promises);
        }catch(err){
            if(quit) quit(true);
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            throw err;
        }
        return true;
    };

    const p = (x: Tpipe)=>(data: Data, mode: "all"|"race"|"allSettled" = "all")=>parallel(x, mode, data.ctx);

    const serial: Serial = async(tasks, ctx=null) => {
        let ok = false;
        const data = {
            data: null,
            ctx: ctx  || {}
        };

        let quit;
        if(ctx) quit = ctx.quit;

        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }
    
        try{
            for(const t of tasks){ 
                if(typeof t === 'function'){
                    const x = await t(data);
                    data.data = x;
                }
                else if(typeof t === 'string'){
                    if(t !== 'throws'){
                        const m = namespace[t];
                        if(typeof m === 'function'){
                            data.data = await m(data);
                        }else{
                            try{
                                const x = await m.next(data);
                                data.data = x.value;
                                if(dev) path.push(x.value);
                                if(x.done && quit) quit(false, x.value);
                            }catch(err){
                                if(DEBUG.v)
                                    // eslint-disable-next-line no-console
                                    console.log(err);
                                if(dev) path.push('throws');
                                if(quit) quit(true);
                                throw err;
                            }                            
                        }
                    }                    
                }
                else if(Array.isArray(t)){
                    await serial(t, data);
                }
                else{
                    try{
                        const x = await t.next(data);
                        data.data = x.value;
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit(false, x.value);
                    }catch(err){
                        if(DEBUG.v)
                            // eslint-disable-next-line no-console
                            console.log(err);
                        if(dev) path.push('throws');
                        if(quit) quit(true);
                        throw err;
                    }                                               
                } 
            }
            ok = true;
        }catch(err){
            if(quit) quit(true);
            if(tasks.at(-1) === 'throws'){      
                throw err;
            }
            else{
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
            }
        }
        return ok;
    };

    return {
        w,
        watch,        
        parallel,        
        p,
        serial,
        nr
    };
}