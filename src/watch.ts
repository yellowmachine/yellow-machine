import { watch as chwatch } from 'chokidar';
import { emitKeypressEvents } from 'node:readline';

export const SHOW_QUIT_MESSAGE = {v: false};
export const DEBUG = {v: false};

emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

type F = () => Promise<any>;

export default (files: string[]) => () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let _close: null|Close;
    return {
        setup: ({single}: {single: F}) => {
            const {promise, close} = watch(files, single);
            _close = close;
            return promise;
        },
        close: () => {
            if(_close)_close();
        }
    };
};

type Close = (err?: boolean, data?: any) => void;

const watch = (files: string[], f: F) => {
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
            await f();         
            if(SHOW_QUIT_MESSAGE.v)
                // eslint-disable-next-line no-console
                console.log("Press " + q + " to quit!");
        }catch(err){
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
};