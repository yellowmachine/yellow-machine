import { Data, FD } from '.';

export default (mode: "all"|"race"|"allSettled" = "all", 
                map: ((data: Data)=>any)|null = null) => (pipes: FD[]) => async (data: Data) => {
    
    console.log('parallel', mode, pipes);
    const promises: Promise<any>[] = [];   

    for(const t of pipes){
        if(map) data = {ctx: data.ctx, data: map(data.data)};
        promises.push(t(data));
    }
    if(mode === "all") return await Promise.all(promises);
    //else if (mode === "any") return await Promise.any(promises);
    else if (mode === "race") return await Promise.race(promises);
    else if (mode === "allSettled") return await Promise.allSettled(promises);
    return false;
};
