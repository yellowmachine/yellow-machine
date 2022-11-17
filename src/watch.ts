

import { watch as chwatch } from 'chokidar';
import { emitKeypressEvents } from 'node:readline';

import { type SETUP, type Data } from '.';

export const SHOW_QUIT_MESSAGE = {v: false};
export const DEBUG = {v: false};

emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

export default (files: string[]) => (setup: SETUP) => async (data: Data) => {

    const quit = data.ctx.quit;

    const f = setup["single"];
    try{
        return await main();
    }catch(err){
        return false;
    }

    function main(){
        const q = 'q';
        const h = (ch: string) => {
            if(ch === q){
                close();
            }
        };
        process.stdin.on('keypress', h);        

        let resolve: (null|((arg0: (any)) => void)) = null;
        let reject: (null|(() => void)) = null;

        const p: Promise<any> = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        let exited = false;
        function close(err = false, data: any = null){
            if(!exited){
                quit();
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
            return true;
        }

        async function exitedRun(){
            while(!exited){   
                await run();
            }
        }

        async function run(){
            try{
                await f(data);         
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
        return p;
    }
};
