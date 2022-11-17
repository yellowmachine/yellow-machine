import {type Data, type SingleOrMultiple} from '.';
type SWF = (data: any)=>number;

export default (f: SWF) => () => {
    return {
        setup: ({multiple}: SingleOrMultiple) => {
            return select(multiple, f);  
        }
    };
};

const select = (tasks: SingleOrMultiple["multiple"], f: SWF) =>{
    return async (data: Data) => {
        const task = tasks[f(data)];
        return await task(data);
    };
};
