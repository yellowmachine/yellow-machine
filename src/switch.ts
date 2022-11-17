import {type Data, type SETUP} from '.';
type SWF = (data: any)=>number;

export default (f: SWF) => {
    return {
        setup: ({multiple}: SETUP) => {
            return select(multiple, f);  
        }
    };
};

const select = (tasks: SETUP["multiple"], f: SWF) => async(data: Data) => {
    const task = tasks[f(data)];
    return await task(data);
    /*
    return async (data: Data) => {
        const task = tasks[f(data)];
        return await task(data);
    };
    */
};
