import { watch as chwatch } from 'chokidar';
 // eslint-disable-next-line 
const keypress = require('keypress');

keypress(process.stdin);
process.stdin.setRawMode(true);

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

    const watcher = chwatch(options.files, {ignoreInitial: true}).
        on('all', async (event, path) => {
        // eslint-disable-next-line no-console
        console.log(event, path);
        try{
            await options.f(close);
            // eslint-disable-next-line no-console
            console.log("Press " + options.quit + " to quit.");
        }catch(err){
            // eslint-disable-next-line no-console
            console.log(err);
        }
        
    });

    return p;
}

export async function pipe(...rest: (((arg0: any) => any)|string)[]){
    let ok = false;
    let data = {};

    try{
        for(const t of rest){
            if(typeof t === 'function')
                data = await t(data);
        }
        ok = true;
    }catch(err){
        if([...rest].at(-1) === 'throws')
            throw err;
    }
    
    return ok;
}

/*
function f1(){
    //throw new Error('salimos??')
    console.log('f1')
}

function f2(){
    console.log('f2')
}

function mydocker(){
    let ctx = null
    return {
        up: async () => {
            console.log('up')
            ctx = 1
        },
        down: async () => {
            console.log('down', ctx)
        }
    }
}

const {up, down} = mydocker()

async function main(){
    let ok = await pipe(up, 'throws')

    if(ok){
        const {listen, close} = watch({files: ["*.js"], quit: 'q'})
        while(await listen()){
            ok = await pipe(f1, f2) 
            if(!ok)   
                close()
        }
        await pipe(down)
    }
}

main()
*/
