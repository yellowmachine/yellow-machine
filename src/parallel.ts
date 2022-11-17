import { type SingleOrMultiple } from '.';

export default (mode: "all"|"race"|"allSettled" = "all") => () => {
    return {
        setup: ({multiple}: SingleOrMultiple) => {
            return parallel(multiple, mode);  
        }
    };
};

const parallel = async (tasks: SingleOrMultiple["multiple"], mode="all") =>{

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
        // eslint-disable-next-line no-console
        console.log(err);
        throw err;
    }
    return true;
};
