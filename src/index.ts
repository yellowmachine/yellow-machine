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

type f = ((arg0: any) => any);
type tpipe = (f|'throws'|tpipe)[];

export function awatch(files: string[],
    ...f: tpipe
    ){
        return () => watch(files, f);
}

export function watch(files: string[],
                      f: tpipe|((arg0: (()=>void)) => void)
                      ){
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

    async function run(f: tpipe|((arg0: (()=>void)) => void)){
        try{
            if(typeof f === 'function')
                await f(close);
            else
                await pipe(...f);
            // eslint-disable-next-line no-console
            console.log("Press " + q + " to quit.");
        }catch(err){
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

export async function pipe(...rest: tpipe){
    let ok = false;
    let data = {};

    try{
        for(const t of rest){
            if(typeof t === 'function'){
                data = await t(data);
            }else if(Array.isArray(t)){
                await pipe(...t);
            }
        }
        ok = true;
    }catch(err){
        // eslint-disable-next-line no-console
        console.log(err);
        if([...rest].at(-1) === 'throws')
            throw err;
    }
    return ok;
}
