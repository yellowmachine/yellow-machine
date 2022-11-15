import {openSync, close, writeSync, rmSync} from 'fs';
import { DEBUG, context as C, type Data, type F, type Tpipe, type Serial } from '../index';
import watch from '../watch';
import nr from '../nr';

DEBUG.v = true;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test("not reentrant", async() => {
    let count = 0;
    const path: string[] = [];

    const fileName = "./src/__tests__/b.hey";
    const {w, serial, nrk} = C({}, {w: watch([fileName]), nrk: nr('key')});

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx?.quit();
    }

    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial([w(nrk(f))])();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
});

test("not reentrant compact mode", async() => {
    let count = 0;
    const path: string[] = [];
    const fileName = "./src/__tests__/b.hey";
    const {serial} = C({f}, {w: watch([fileName]), nrk: nr('key')});

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx?.quit();
    }

    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial("w[nrk[f")();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
    
});