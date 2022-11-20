import { Data, type SETUP } from '.';

export default (n: number) => (setup: SETUP) => async (data: Data) => {
    const pipe = setup["single"];
    
    const initialData = data.data;
    for(;;){
        try{
            return await pipe({...data, data: initialData}); 
        }catch(err){
            n--;
            if(n === 0) throw err;
        }    
    } 
};
