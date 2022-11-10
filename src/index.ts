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

export const DEBUG = {v: false};

export type Data = {data?: any, ctx: {quit: ()=>void}};
type F = ((arg0: Data) => any);
type Tpipe = (Generator|F|string|Tpipe)[];

export const dev = (path: string[]) => (namespace: Record<string, Generator|((arg0: Data)=>any)>) => context(namespace, true, path);

export function context(namespace: Record<string, Generator|((arg0: Data)=>any)> = {}, dev=false, path: string[]=[]){
    
    function w(files: string[],f: Tpipe){
        return () => watch(files, f);
    }

    function watch(files: string[], f: Tpipe|((arg0: (()=>void)) => void)){
        const q = 'q';

        process.stdin.on('keypress', function (ch, key) {
        if (key.name === q) {
            close();
            }
        });

        let resolve: (null|((arg0: (string|boolean)) => void)) = null;

        const p = new Promise((r) => {
            resolve = r;
        });

        let exited = false;
        function close(){
            if(!exited){
                exited = true;
                process.stdin.pause();
                if(resolve) resolve(false);
                if(watcher)
                    watcher.close();
            }
        }

        async function run(f: Tpipe|((arg0: (()=>void)) => void)){
            try{
                if(typeof f === 'function')
                    await f(close);
                else
                    await serial(f, {quit: close}, close);
                // eslint-disable-next-line no-console
                console.log("Press " + q + " to quit.");
            }catch(err){
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
                //close();
            }
        }

        let watcher: null | ReturnType<typeof chwatch> = null;
        if(!dev){
            watcher = chwatch(files, {ignoreInitial: true}).
                on('all', (event, path) => {
                    // eslint-disable-next-line no-console
                    console.log(event, path);
                    run(f);
                });
            run(f);
        }else{
            while(!exited){
                run(f);
            } 
        }
        return p;
    }

    async function parallel(tasks: Tpipe, ctx: any=null, quit: (null|(()=>void))=null){
        const promises: Promise<any>[] = [];
    
        async function run(f: ()=>Promise<any>){
            try{
                await f();
            }catch(err){
                if(quit) quit();
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
                throw err;
            }
        }

        const data = {
            data: null,
            ctx: ctx  || {}
        };
    
        for(const t of tasks){
            if(typeof t === 'function'){
                //promises.push(t({...data}));
                promises.push(run(()=>t({...data})));
            }else if(Array.isArray(t)){
                //promises.push(serial(t, {...data}));
                promises.push(run(()=>serial(t, {...data})));
            }else if(typeof t === 'string'){
                const m = namespace[t];
                if(typeof m === 'function'){
                    //promises.push(m({...data}));
                    promises.push(run(()=>m({...data})));
                }else{
                    try{
                        const x = m.next(data);
                        //data.data = x.value;
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit();
                    }catch(err){
                        if(DEBUG.v)
                            // eslint-disable-next-line no-console
                            console.log(err);
                        if(dev) path.push('throws');
                        if(quit) quit();
                    }                    
                }
            }else{
                try{
                    const x = t.next(data);
                    //data.data = x.value;
                    if(dev) path.push(x.value);
                    if(x.done && quit) quit();
                }catch(err){
                    if(DEBUG.v)
                        // eslint-disable-next-line no-console
                        console.log(err);
                    if(dev) path.push('throws');
                    if(quit) quit();
                }                
            } 
        }
        await Promise.all(promises);
        return true;
    }

    const p = (x: Tpipe)=>(data: Data)=>parallel(x, null, data.ctx.quit);

    async function serial(tasks: Tpipe, ctx: any=null, quit: (null|(()=>void))=null){
        let ok = false;
        const data = {
            data: null,
            ctx: ctx  || {}
        };
    
        try{
            for(const t of tasks){
                if(typeof t === 'function'){
                    data.data = await t(data);
                }
                else if(typeof t === 'string'){
                    if(t !== 'throws'){
                        const m = namespace[t];
                        if(typeof m === 'function'){
                            data.data = await m(data);
                        }else{
                            const x = m.next(data);
                            data.data = x.value;
                            if(dev) path.push(x.value);
                            if(x.done && quit) quit();
                        }
                    }                        
                }
                else if(Array.isArray(t)){
                    await serial(t, data, quit);
                }
                else{
                    const x = t.next(data);
                    data.data = x.value;
                    if(dev) path.push(x.value);
                    if(x.done && quit) quit();
                } 
            }
            ok = true;
        }catch(err){
            if(quit) quit();
            if(tasks.at(-1) === 'throws')
                throw err;
            else{
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
            }
        }
        return ok;
    }

    return {
        w,
        watch,        
        parallel,        
        p,
        serial
    };
}