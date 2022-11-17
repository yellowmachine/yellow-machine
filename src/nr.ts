import { Data, FD, type SETUP } from '.';
export type MODE = "buffer"|"nobuffer"|"custom";
export type BFUNC = null|((arg: Data[]) => Data[]);

export default (mode: MODE = "nobuffer", bfunc: BFUNC = null) => (setup: SETUP): FD => {

    const pipe = setup["single"];

    let exited = true;
    let buffer: Data[] = [];

    return async (data: Data) => {
        do{
            try{
                if(exited){
                    exited = false;
                    const ret = await pipe(data);
                    return ret;
                }else{
                    if(mode === "buffer")
                        buffer.push(data);
                    else if(mode === "custom"){
                        if(bfunc) buffer = bfunc(buffer);
                    }
                    return false;
                }
            }catch(err){
                // eslint-disable-next-line no-console
                console.log(err);
                throw(err);
            }finally{
                exited = true;
            }
        }while(buffer.length > 0);
    };
};
