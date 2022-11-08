import {openSync, close, writeSync, rmSync} from 'fs';
import { pwatch, watch, pipe, DEBUG, type C } from '../index';

DEBUG.v = false;

test('watch', async () => {

    async function f1(){
        return 1;
    }

    async function f_error(){
        throw new Error("my error");
    }

    async function f(){
        await watch(["*.hey"], 
                    async (quit)=>{
            const ok = await pipe([f1, f_error]); 
            if(!ok)   
                quit();
            });
        return true; 
    }
    const v = await f();
    expect(v).toBeTruthy();
  });

test('watch 2', async () => {
    let count = 0;

    async function f_count(){
        count += 1;
    }
    const fileName = "./src/__tests__/a.hey";
    const interval = setInterval(()=>{
        const fh = openSync(fileName, 'a');
        writeSync(fh, ""+count);
        close(fh);
    }, 1000);

    async function f(){
        await watch([fileName], 
                     async (quit)=>{
            await pipe([f_count]);
            if(count === 3)   
                quit();
            });
        return true; 
    }
    await f();
    expect(count).toBe(3);
    clearInterval(interval);
    rmSync(fileName);
});

test('watch pipe', async () => {
    const path: string[] = [];
    const a = async() => path.push('a');
    const f_throws = async () => {
        path.push('f throws');
        throw new Error("my x error");
    };
    const end = async() => path.push('end');
    const b = async() => path.push('b');
    await pipe([a, [pwatch(["*.hey"], [f_throws, b, 'throws']), end]]);
    expect(path).toEqual(['a', 'f throws', 'end']);
});

test('watch pipe with quit', async () => {
    const path: string[] = [];
    const a = async() => path.push('a');
    const f_quit = async(payload: C) => {
        path.push('quit');
        payload.ctx.quit();
    };
    const end = async() => path.push('end');
    const b = async() => path.push('b');
    await pipe([a, [pwatch(["*.hey"], [f_quit, b]), end]]);
    expect(path).toEqual(['a', 'quit', 'b', 'end']);
});