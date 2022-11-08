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