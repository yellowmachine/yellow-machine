import { watch as chwatch } from 'chokidar';
// eslint-disable-next-line 
const keypress = require('keypress');

keypress(process.stdin);
try{
    process.stdin.setRawMode(true);
}catch(err){
    // eslint-disable-next-line no-console
    console.log("There's an error with 'process.stdin.setRawMode(true)'");
    // eslint-disable-next-line no-console
    console.log("It should be only with jest tests.");
}

export function *g(arr: string[]){
    for(const i of arr){
        if(i === 'throw') throw new Error(i);
        else yield i;
    }
}

export const DEBUG = {v: false};
export const SHOW_QUIT_MESSAGE = {v: false};

export type Data = {data?: any, ctx: {quit: ()=>void}};
type F = ((arg0: Data) => any);
export type Tpipe = (Generator|AsyncGenerator|F|string|Tpipe)[];

type JCpipe = ({w?: [string[], Jpipe], p?: Jpipe}|string); 
export type Jpipe = JCpipe[];

export const dev = (path: string[]) => (namespace: Record<string, Generator|AsyncGenerator|((arg0: Data)=>any)>) => context(namespace, true, path);

export function context(namespace: Record<string, Generator|AsyncGenerator|((arg0: Data)=>any)> = {}, dev=false, path: string[]=[]){

    function normalize(data: Jpipe|JCpipe, ret: Tpipe){
        if(Array.isArray(data)){
            //const aux: Tpipe = [];
            for(const x of data){
                normalize(x, ret);
            }
            //ret.push(aux);
        }else{
            if(typeof data === 'string'){
                ret.push(data);
            }else if(data.w){
                const aux: Tpipe = [];
                normalize(data.w[1], aux);
                ret.push(w(data.w[0], aux));
            }else if(data.p){
                const aux: Tpipe = [];
                normalize(data.p, aux);
                ret.push(p(aux));
            }
        }
    }

    function w(files: string[],f: Tpipe){
        return () => watch(files, f);
    }

    function watch(files: string[], f: Tpipe|((arg0: (()=>void)) => void)){
        const q = 'q';

        const h = (ch: any, key: any) => {
            if (key.name === q) {
                close();
            }
        };
        process.stdin.on('keypress', h);        

        let resolve: (null|((arg0: (string|boolean)) => void)) = null;
        let reject: (null|((arg0: any) => void)) = null;

        const p = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        let exited = false;
        function close(err = false){
            if(!exited){
                exited = true;
                process.stdin.pause();
                process.stdin.removeListener("keypress", h);
                if(err){
                    if(reject) reject(true);
                }
                else if(resolve) resolve(true);
                if(watcher)
                    watcher.close();
            }
        }

        async function exitedRun(f: Tpipe|((arg0: (()=>void)) => void)){
            while(!exited){
                await run(f);
            }
        }

        async function run(f: Tpipe|((arg0: (()=>void)) => void)){
            try{
                if(typeof f === 'function')
                    await f(close);
                else{
                    await serial(f, {quit: close}, close);
                }                
                if(SHOW_QUIT_MESSAGE.v)
                    // eslint-disable-next-line no-console
                    console.log("Press " + q + " to quit.");
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

    async function parallel(tasks: Tpipe, ctx: any=null, quit: (null|((arg0?: boolean)=>void))=null, mode: "all"|"race"|"allSettled" = "all"){
        const promises: Promise<any>[] = [];   

        const data = {
            data: null,
            ctx: ctx  || {}
        };
    
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
                        if(x.done && quit) quit();
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
                    if(x.done && quit) quit();
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
    }

    const p = (x: Tpipe)=>(data: Data, mode: "all"|"race"|"allSettled" = "all")=>parallel(x, null, data.ctx.quit, mode);

    async function serial(tasks: Tpipe, ctx: any=null, quit: (null|((arg?: boolean)=>void))=null){
        let ok = false;
        const data = {
            data: null,
            ctx: ctx  || {}
        };
    
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
                                if(x.done && quit) quit();
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
                    await serial(t, data, quit);
                }
                else{
                    try{
                        const x = await t.next(data);
                        data.data = x.value;
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit();
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
    }

    async function run(data: {serial?: Jpipe, parallel?: Jpipe}){
        if(data.serial){
            const aux: Tpipe = [];
            normalize(data.serial, aux);
            await serial(aux);
        }else if(data.parallel){
            const aux: Tpipe = [];
            normalize(data.parallel, aux);
            await parallel(aux);
        }
    }

    return {
        w,
        watch,        
        parallel,        
        p,
        serial,
        normalize,
        run
    };
}