import { CallableArray, Data, FD } from '.';
export type MODE = "buffer"|"nobuffer"|"custom";
export type BFUNC = null|((arg: BufferData[]) => BufferData[]);

type Resolve = (null|((arg0: (any)) => void));
type Reject = (null|(() => void));
type BufferData = {resolve: Resolve, reject: Reject, data: Data};

function createResolve(){
    let innerResolve: Resolve = null;
    let innerReject: Reject = null;

    const p: Promise<any> = new Promise((_resolve, _reject) => {
        innerResolve = _resolve;
        innerReject = _reject;
    });

    function resolve(v: boolean){
        if(innerResolve) innerResolve(v);
    }

    function reject(){
        if(innerReject) innerReject();
    }

    return {resolve, reject, promise: p};
}

export default ({mode, size}: {mode?: MODE, size?: number} = {mode: "nobuffer"}) => 
    (pipes: FD[]): FD => {

    let exited = true;
    const buffer: BufferData[] = [];
    
    const g = async (data: Data) => {
        if(!exited){
            if(mode === "buffer" && (size === undefined || buffer.length < size - 1)){
                const x = createResolve();
                buffer.push({...x, data});
                try{
                    await x.promise; 
                }catch(err){
                    if(buffer.length > 0){
                        const {reject} = buffer.pop() as BufferData;
                        if(reject) reject();
                    }
                    throw err;        
                }
            }else{
                return null;
            }
        }
        try{
            exited = false;
            const response = await pipes[0](data);
            exited = true;
            if(buffer.length > 0){
                const {resolve} = buffer.pop() as BufferData;
                if(resolve) resolve(response);
            }
            return response;
        }catch(err){
            if(buffer.length > 0){
                const {reject} = buffer.pop() as BufferData;
                if(reject) reject();
            }
            throw err;
        }
    };

    return g;
};
