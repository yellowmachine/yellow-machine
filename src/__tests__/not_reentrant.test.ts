import {openSync, close, writeSync, rmSync} from 'fs';
import { DEBUG, context as C, type Data, type F, type Tpipe, type Serial } from '../index';
import watch from '../watch';

DEBUG.v = true;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test("not reentrant", async() => {
    let count = 0;
    const path: string[] = [];

    const {w, serial, nr} = C({}, {w: watch(["*.js"])});

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx?.quit();
    }

    const fileName = "./src/__tests__/b.hey";
    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial([w(nr(f))]);
    expect(path).toEqual(['f']);
    clearInterval(interval);
    rmSync(fileName);
});

test("not reentrant compact mode", async() => {
    let count = 0;
    const path: string[] = [];

    const {serial} = C({f}, {w: watch(["*.js"])});

    async function f(d: Data){
        path.push('f');
        await sleep(1000);
        d.ctx?.quit();
    }

    const fileName = "./src/__tests__/b.hey";
    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
        count += 1;
    }, 200);

    await serial("w[nr[f");
    expect(path).toEqual(['f']);
    clearInterval(interval);
    rmSync(fileName);
});