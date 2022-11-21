import { Data, FD } from '.';
import { Pipe } from './pipe';

export default (n: number) => (pipes: FD[]) => async (data: Data) => {
    const promises: Promise<boolean>[] = [];

    while(n--){
        const p = pipes[0](data);
        promises.push(p);
        p.catch(()=>{
            return false;
        });
    }
    await Promise.all(promises);
    return true;
};
