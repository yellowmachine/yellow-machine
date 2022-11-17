import { type SETUP, type Data } from '.';

export default  (n: number) => {
    return {
        setup: ({single}: SETUP) => {
            return repeat(single, n);  
        }
    };
};

const repeat = (f: SETUP["single"], n: number) => async (data: Data) => {
    while(n--){
        console.log('repeat', n);
        /*data = {data: n, ctx: {quit: (err?: boolean, data?: any)=>{
            return true;
        }}};
        */
        const p = f(data);
        p.catch(()=>{
            return false;
        });
    }
    return true;
};
