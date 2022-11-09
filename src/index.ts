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
type Tpipe = (F|string|Tpipe)[];

export function context(namespace: Record<string, (arg0: Data)=>any> = {}){
    
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

        function close(){
            process.stdin.pause();
            if(resolve) resolve(false);
            watcher.close();
        }

        async function run(f: Tpipe|((arg0: (()=>void)) => void)){
            try{
                if(typeof f === 'function')
                    await f(close);
                else
                    await serial(f, {quit: close});
                // eslint-disable-next-line no-console
                console.log("Press " + q + " to quit.");
            }catch(err){
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
                close();
            }
        }

        const watcher = chwatch(files, {ignoreInitial: true}).
        on('all', (event, path) => {
            // eslint-disable-next-line no-console
            console.log(event, path);
            run(f);
        });

        run(f);

        return p;
    }

    async function parallel(tasks: Tpipe, ctx: any=null){
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
            }
        }
        await Promise.all(promises);
        return true;
    }
    const p = (x: Tpipe)=>()=>parallel(x);

    async function serial(tasks: Tpipe, ctx: any=null){
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
                else if(typeof t === 'string' && t !== 'throws'){
                    await namespace[t](data);
                }
                else if(Array.isArray(t)){
                    await serial(t, data);
                }
            }
            ok = true;
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            if(tasks.at(-1) === 'throws')
                throw err;
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