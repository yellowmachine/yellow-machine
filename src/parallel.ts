import { DEBUG } from '.';

export default () => () => {
    return {
        setup: ({multiple}: {multiple: ArrFD}) => {
            return parallel(multiple);  
        }
    };
};

type ArrFD = (()=>Promise<any>)[];

const parallel = async (tasks: ArrFD, mode="all") =>{

    const promises: Promise<any>[] = [];   

    for(const t of tasks){
        promises.push(t());
    }
    try{
        if(mode === "all") await Promise.all(promises);
        //else if (mode === "any") await Promise.any(promises);
        else if (mode === "race") await Promise.race(promises);
        else if (mode === "allSettled") await Promise.allSettled(promises);
    }catch(err){
        if(DEBUG.v)
            // eslint-disable-next-line no-console
            console.log(err);
        throw err;
    }
    return true;
};
