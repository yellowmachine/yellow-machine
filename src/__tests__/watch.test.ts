import {openSync, close, writeSync} from 'fs';
import { watch, pipe } from '../index';

async function f1(){
    return 1;
}
  
async function f_error(){
    throw new Error("my error");
}

test('watch', async () => {
    async function f(){
        await watch({files: ["*.hey"], 
                     quit: 'q', 
                     f: async (quit)=>{
            const ok = await pipe(f1, f_error); 
            if(!ok)   
                quit();
            }}
        );
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
        await watch({files: [fileName], 
                     quit: 'q', 
                     f: async (quit)=>{
            await pipe(f_count);
            if(count === 3)   
                quit();
            }}
        );
        return true; 
    }
    await f();
    expect(count).toBe(3);
    clearInterval(interval);
});
