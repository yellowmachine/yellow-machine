import { DEBUG, type SingleOrMultiple, type Data } from '.';

export default () => () => {
    return {
        setup: ({single}: SingleOrMultiple) => {
            return nr(single);  
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        close: () => {
        }
    };
};

type F = () => Promise<any>;

async function nr(f: F){
    let exited = true;
    return async function(){
        if(exited){
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
        }
    };
}