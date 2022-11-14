import { DEBUG, type SingleOrMultiple, type Data, type Ctx } from '.';

export default () => () => {
    return {
        setup: ({multiple}: SingleOrMultiple) => {
            return parallel(multiple);  
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        close: () => {}
    };
};

type ArrFD = ((data: Data)=>Promise<any>)[];

const parallel = async (tasks: ArrFD, mode="all", ctx: Ctx=null) =>{
    const promises: Promise<any>[] = [];   

    const data = {
        data: null,
        ctx: ctx || {}
    };

    let quit;
    if(ctx) quit = ctx.quit;

    for(const t of tasks){
        promises.push(t({...data}));
    }
    try{
        if(mode === "all") await Promise.all(promises);
        //else if (mode === "any") await Promise.any(promises);
        else if (mode === "race") await Promise.race(promises);
        else if (mode === "allSettled") await Promise.allSettled(promises);
    }catch(err){
        if(quit) quit(true);
        if(DEBUG.v)
            // eslint-disable-next-line no-console
            console.log(err);
        throw err;
    }
    return true;
};
