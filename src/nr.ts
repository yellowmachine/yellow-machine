import { DEBUG } from '.';

export default  () => {
    return {
        setup: ({single}: {single: F}) => {
            return nr(single)();  
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        close: () => {
        }
    };
};

type F = () => Promise<any>;

const nr = (f: F) => {
    let exited = true;
    return async () => {
        try{
            exited = false;
            return await f();
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            throw(err);
        }finally{
            exited = true;
        }
    };
};
