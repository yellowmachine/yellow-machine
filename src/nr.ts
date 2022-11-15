import { DEBUG, type SingleOrMultiple, type Data } from '.';

export default (key: string) => () => {
    return {
        setup: ({single}: SingleOrMultiple) => {
            return nr(key, single);  
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        close: () => {
        }
    };
};

type F = () => Promise<any>;

const cacheExited: {[key: string]: boolean} = {};

const nr = async (key: string, f: F) => {
    
    if(typeof cacheExited[key] || cacheExited[key] === undefined){
        try{
            cacheExited[key] = false;
            return await f();
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            throw(err);
        }finally{
            cacheExited[key] = true;
        }
    }
};