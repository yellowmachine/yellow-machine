import { type SETUP, type Data, type FD } from '.';

type BFUNC = null|((arg0: Data[])=>Data[]);
type MODE = "custom"|"buffer"|"nobuffer";

export default  (mode: MODE = "nobuffer", bfunc: BFUNC = null) => {
    return {
        setup: ({single}: SETUP) => {
            console.log('setup');
            return nr(single, bfunc, mode);  
        }
    };
};

const nr = (f: FD, bfunc: BFUNC, mode: MODE) => {
    console.log('created nr');
    let exited = true;
    let buffer: Data[] = [];

    return async (data: Data) => {
        console.log('entramos con data', data);
        do{
            try{
                console.log(exited);
                if(exited){
                    exited = false;
                    console.log('exited = false');
                    const ret = await f(data);
                    console.log('exit');
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
