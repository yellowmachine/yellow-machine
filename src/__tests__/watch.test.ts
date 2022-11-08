import {openSync, close, writeSync, rmSync} from 'fs';
import { pwatch, watch, pipe, DEBUG, type C } from '../index';

DEBUG.v = false;

async function f1(){
    return 1;
}
  
async function f_error(){
    throw new Error("my error");
}

async function f_x(){
    throw new Error("my x error");
}

test('watch', async () => {
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
    let v_end = false;
    let v_none = false;
    const end = async() => {v_end=true;};
    const f_none = async() => {v_none=true;};
    await pipe([f1, [pwatch(["*.hey"], [f1, f_x, f_none, 'throws']), end]]);
    expect(v_end).toBeTruthy();
    expect(v_none).toBeFalsy();
});

test('watch pipe with quit', async () => {
    let v_end = false;
    let v_f_x = false;
    const f_1 = async(payload: C) => {
        payload.ctx.quit();
    };
    const end = async() => {v_end=true;};
    const f_x = async() => {v_f_x=true;};
    await pipe([f1, [pwatch(["*.hey"], [f_1, f_x]), end]]);
    expect(v_end).toBeTruthy();
    expect(v_f_x).toBeTruthy();
});