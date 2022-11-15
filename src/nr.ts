export default  () => {
    return {
        setup: ({single}: {single: F}) => {
            return nr(single)();  
        },
        //close: () => true
    };
};

type F = () => Promise<any>;

const nr = (f: F) => {
    let exited = true;
    return async () => {
        try{
            exited = false;
            return await f();
        }catch(err){
            // eslint-disable-next-line no-console
            console.log(err);
            throw(err);
        }finally{
            exited = true;
        }
    };
};
