import { Data, type SETUP } from '.';

export default (n: number) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];
    while(n--){
        const p = pipe(data);
        p.catch(()=>{
            return false;
        });
    }
    return true;
};
