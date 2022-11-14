import { DEBUG, SHOW_QUIT_MESSAGE, type S, type Tpipe, type F } from '.';
import { watch as chwatch } from 'chokidar';
import { emitKeypressEvents } from 'node:readline';

emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

export default (files: string[]) => ({s}:{s: S}) => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let _close = () => {};
    return {
        setup: (f: F|Tpipe) => (/*data: Data*/) => {
            const {promise, close} = watch({s}, files, f);
            _close = close; 
            return promise;
        },
        close: _close
    };
};

function watch({s}:{s: S}, files: string[], f: F|Tpipe): {promise: Promise<any>, close: ()=>void}{
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
    function close(err = false, data: any = null){
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

    async function exitedRun(){
        while(!exited){   
            await run();
        }
    }

    async function run(){
        try{
            if(typeof f === 'function')
                await s([f, 'throws'])({ctx: {quit: close}});
            else{
                await s(f)({ctx: {quit: close}});
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
    if(!DEBUG.v){
        watcher = chwatch(files, {ignoreInitial: true}).
            on('all', (event, path) => {
                // eslint-disable-next-line no-console
                //console.log(event, path);
                run();
            });
        run();
    }else{
        exitedRun();
    }
    return {promise: p, close};
}