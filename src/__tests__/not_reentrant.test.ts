import {openSync, close, writeSync, rmSync} from 'fs';
import { DEBUG, context as C, type Data, type F, type Tpipe, type Serial } from '../index';

DEBUG.v = true;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function custom_nr({serial}:{serial: Serial}){
    return function (f: F|Tpipe){
        let exited = true;
        return async function(data: Data){
            if(exited){
                try{
                    exited = false;
                    return await serial(f, data.ctx);
                }finally{
                    exited = true;
                }
            }
        };
    };
}

test("not reentrant", async() => {
    let count = 0;
    const path: string[] = [];

    const {w, serial, nr} = C();

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx.quit();
    }

    const fileName = "./src/__tests__/b.hey";
    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial([
            w([fileName], 
                nr(f)
            )
    ]);
    expect(path).toEqual(['f']);
    clearInterval(interval);
    rmSync(fileName);
});

test("not reentrant with custom nr", async() => {
    let count = 0;
    const path: string[] = [];

    const {w, serial} = C();

    const nr = custom_nr({serial});

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx.quit();
    }

    const fileName = "./src/__tests__/b.hey";
    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial([
            w([fileName], 
                nr([f])
            )
    ]);
    expect(path).toEqual(['f']);
    clearInterval(interval);
    rmSync(fileName);
});
