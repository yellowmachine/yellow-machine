import {openSync, close, writeSync, rmSync} from 'fs';
import { DEBUG, context as C, type Data } from '../index';
import { parse } from '../parse';
import watch, {DEBUG as wDebug} from '../watch';

DEBUG.v = true;
wDebug.v = true;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test("not reentrant", async() => {
    let count = 0;
    const path: string[] = [];

    const fileName = "./src/__tests__/b.hey";
    const {w, serial, nr} = C({}, {w: watch([fileName])});

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

    await serial([w(nr(f))])();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
});

test("not reentrant compact mode", async() => {
    let count = 0;
    const path: string[] = [];
    const fileName = "./src/__tests__/b.hey";
    const {serial} = C({f}, {w: watch([fileName])});

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

    await serial("w[nr[f")();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
    
});

test("not reentrant ^", async() => {
    let count = 0;
    const path: string[] = [];

    const fileName = "./src/__tests__/b.hey";

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

    const {serial} = C({f}, {w: watch([fileName])});

    await serial("w^[f")();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
});

test("not reentrant ^ deep", async() => {
    let count = 0;
    const path: string[] = [];

    const fileName = "./src/__tests__/c.hey";

    function a(){
        return 'a';
    }

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

    const {serial} = C({a,f}, {w: watch([fileName])});

    await serial("w[a|^f")();
    clearInterval(interval);
    rmSync(fileName);
    expect(path).toEqual(['f']);
});