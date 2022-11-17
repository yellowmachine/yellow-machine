import { Data, FD, type SETUP } from '.';
export type MODE = "buffer"|"nobuffer"|"custom";
export type BFUNC = null|((arg: Data[]) => Data[]);

export default (mode: MODE = "nobuffer", bfunc: BFUNC = null) => (setup: SETUP): FD => {

    const pipe = setup["single"];

    let exited = true;
    let buffer: Data[] = [];
    
    let resolve: (null|((arg0: (any)) => void)) = null;
    let reject: (null|(() => void)) = null;

    let p: Promise<any> = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });

    return (data: Data) => {
        if(!exited){
            console.log('not exited');
            if(mode === "buffer"){
                console.log('buffering', data.data);
                buffer.push(data);
            }
            else if(mode === "custom"){
                if(bfunc) buffer = bfunc(buffer);
            }
            return p;
        }else{
            console.log('before do');
            do{
                console.log('buffer.length', buffer.length);
                if(buffer.length > 0) data = buffer.pop() as Data;
                console.log('procesamos data', data);
                try{
                    exited = false;
                    p = pipe(data);
                    console.log('after await nr');
                    //return ret;
                }catch(err){
                    console.log(err);
                    // eslint-disable-next-line no-console
                    console.log(err);
                    //exited = true;
                    throw(err);
                }finally{
                    console.log('finally');
                    exited = true;      
                }
            }while(buffer.length > 0);
            if(resolve) resolve(true);
            return p;
        }
    };
};
