import { Data, FD, type SETUP } from '.';
export type MODE = "buffer"|"nobuffer"|"custom";
export type BFUNC = null|((arg: Data[]) => Data[]);

export default (mode: MODE = "nobuffer", bfunc: BFUNC = null) => (setup: SETUP): FD => {

    const pipe = setup["single"];

    let exited = true;
    let buffer: Data[] = [];
    
    const g = (data: Data) => {
        if(!exited){
            console.log('not exited');
            if(mode === "buffer"){
                console.log('buffer push');
                buffer.push(data);
            }
            else if(mode === "custom"){
                if(bfunc) buffer = bfunc(buffer);
            }
            if(data.ctx.promise) return data.ctx.promise;
            else return Promise.resolve(false);
        }else{
            console.log('exited');
            if(data.ctx.promise){
                console.log('dentro de if', data.ctx.promise);
                const p = data.ctx.promise;
                p.then(()=>{
                    console.log("**************************************");
                    exited=true;
                    if(buffer.length > 0){
                        console.log('pop');
                        data = buffer.pop() as Data;
                        g(data);
                    }
                }).catch(err=>console.log(err));
                exited = false;
                pipe(data);
                return p;
            }else{
                console.log('resolve a false');
                return Promise.resolve(false);
            }
        }
    };

    return g;
};
