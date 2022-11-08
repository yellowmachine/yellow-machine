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

export function watch(options: {f: ((arg0: (()=>void)) => void), quit: string, files: string[]}){
    process.stdin.on('keypress', function (ch, key) {
        if (key.name === options.quit) {
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

    async function run(f: ((arg0: (()=>void)) => void)){
        try{
            await f(close);
            // eslint-disable-next-line no-console
            console.log("Press " + options.quit + " to quit.");
        }catch(err){
            // eslint-disable-next-line no-console
            console.log(err);
        }
    }

    const watcher = chwatch(options.files, {ignoreInitial: true}).
        on('all', (event, path) => {
        // eslint-disable-next-line no-console
        console.log(event, path);
        run(options.f);
    });

    run(options.f);

    return p;
}

export async function pipe(...rest: (((arg0: any) => any)|string)[]){
    let ok = false;
    let data = {};

    try{
        for(const t of rest){
            if(typeof t === 'function'){
                data = await t(data);
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
