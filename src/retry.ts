import { Data, type SETUP } from '.';

export default (n: number) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];
    const initialData = {...data, data: data.data};
    for(;;){
        try{
            return await pipe(initialData); 
        }catch(err){
            n--;
            if(n === 0) throw err;
        }    
    } 
};
