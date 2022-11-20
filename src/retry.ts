import { Data, type SETUP } from '.';

export default (n: number, map: ((data: Data)=>any)|null = null) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];

    for(;;){
        try{
            return await pipe(data); 
        }catch(err){
            n--;
            if(n === 0) throw err;
        }    
    }
};
