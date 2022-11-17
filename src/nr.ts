import { type SETUP, type Data, type FD } from '.';

type BFUNC = null|((arg0: Data[])=>Data[]);
type MODE = "custom"|"buffer"|"nobuffer";

export default  (mode: MODE = "nobuffer", bfunc: BFUNC = null) => () => {
    return {
        setup: ({single}: SETUP) => {
            return nr(single, bfunc, mode);  
        }
    };
};

const nr = (f: FD, bfunc: BFUNC, mode: MODE) => {
    let exited = true;
    let buffer: Data[] = [];

    return async (data: Data) => {
        do{
            try{
                if(exited){
                    exited = false;
                    return await f(data);
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
