import { Data, type SETUP } from '.';

export default (n: number) => (setup: SETUP) => async (data: Data) => {
    const promises: Promise<boolean>[] = [];
    const pipe = setup["single"];
    while(n--){
        const p = pipe(data);
        promises.push(p);
        p.catch(()=>{
            return false;
        });
    }
    await Promise.all(promises);
    return true;
};
