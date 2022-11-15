import { DEBUG, type SingleOrMultiple } from '.';
import uid from 'tiny-uid';

export default  () => {
    const key = uid();
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