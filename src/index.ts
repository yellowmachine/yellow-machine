import { parse, type Parsed} from './parse';
import parallel from './parallel';
import _nr from './nr';
import _sw from './switch';

export {default as watch, SHOW_QUIT_MESSAGE} from './watch';

export function *g(arr: string[]){
    for(const i of arr){
        if(i.startsWith('throw') || i.endsWith('!')) throw new Error(i);
        else yield i;
    }
}

export const DEBUG = {v: false, w: false};

export type Data = {data?: any, ctx: Ctx};
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Serial = (tasks: Tpipe|C, ctx: Ctx) => Promise<any>;
export type Parallel = (tasks: Tpipe|C, mode?: "all"|"race"|"allSettled", ctx?: Ctx) => Promise<any>;

export type BUILD = (t: (string|Parsed)[]) => Tpipe;
type FD = ()=>(Promise<any>);
export type SingleOrMultiple = {single: FD, multiple: FD[]};
type SETUP = (arg: SingleOrMultiple) => Promise<any>|((data: Data)=>Promise<any>);
type TON = {setup: SETUP, close?: Quit};
export type S = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type P = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type NR = (f: F) => (data?: Data) => Promise<any>;

type FTON = () => TON;
type Plugin = {[key: string]: FTON};

type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;

export type Quit = (err?: boolean, data?: any)=>boolean;
export type Ctx = {quit: Quit};

export function concatClose(close?: Quit, prevClose?: Quit){
    if(close){
        if(close()){
            if(prevClose) return prevClose();
            else return true;
        }else return true;
    }
    else if(prevClose){
        return prevClose();
    } 
    else return true;
}

export const dev = (path: string[]) => (namespace: Namespace, plugins?: Plugin) => context(namespace, plugins, true, path);

export function context(namespace: Namespace={},
                        plugins: Plugin={}, 
                        dev=false, 
                        path: string[]=[]
                    ){

    const on = (f: FTON): ((pipe: F|Tpipe|string) => (data: Data) => Promise<any>) => {
        const {setup, close} = f();

        return (pipe: F|Tpipe|string) => async (data: Data) => {
            let built: F|Tpipe;

            const prevClose = data.ctx?data.ctx.quit:undefined;

            const backClose = () => {
                return concatClose(close, prevClose);
            };
            if(typeof pipe === 'string') 
                built = build([pipe]);
            else
                built = pipe;
            const single = async () => {
                try{
                    data = {...data, ctx:{quit: ()=>backClose()}};
                    await s(built)(data);
                }catch(err){
                    backClose();
                }
                return true;
            };
            let multiple: FD[] = [];
            if(Array.isArray(built)){
                multiple = built.map(x => async () => {
                    try{
                        data = {...data, ctx:{quit: ()=>backClose()}};
                        if(Array.isArray(x))
                            await s(x)(data);
                        else
                            await s([x])(data);
                    }catch(err){
                        backClose();
                    }
                    return true;
                });
            }
            const returned = setup({single, multiple});
            if(typeof returned === 'function') await returned(data.data);
            await returned;
        };
    };

    function build(parsed: (string|Parsed)[]): Tpipe{
        let ret: Tpipe = [];
        
        if(parsed.length === 0) return [];
        
        for(const chunk of parsed){
            if(typeof chunk === 'string'){
                if(chunk.includes(',')){
                    const aux = chunk.split(",").filter(x => x !== "");
                    const aux2 = aux.map(x => {
                        if(x.startsWith('^')){
                            x = x.substring(1);
                            if(x.includes('|')){
                                return async (data: Data) => await nr(x.split('|').filter(y => y !== ""))(data);
                            }else
                                return async (data: Data) => await nr(x)(data);
                        }
                        else{
                            if(x.includes('|')) return x.split('|').filter(y => y !== "");
                            else return x;
                        }
                    });
                    ret = [...ret, ...aux2];
                }else if(chunk.includes('|')){
                    ret = [...ret, ...chunk.split("|").filter(x => x !== "")];
                }else{
                    ret = [...ret, chunk];
                }
            }else{
                if(chunk.t === '^['){
                    ret = [...ret, (data: Data)=>nr(build(chunk.c))(data)];
                }
                else if(chunk.t === '['){
                    ret = [...ret, (data: Data)=>serial(build(chunk.c), data.ctx)];
                }else if(chunk.t.startsWith("*")){ 
                    const built = build(chunk.c);
                    if(chunk.t === '*p'){
                        ret = [...ret, async (data: Data) => await p(built)(data)];
                    }
                    else if(chunk.t === '*nr'){
                        ret = [...ret, async (data: Data) => await nr(built)(data)];
                    }
                    else if(plugins){
                        const name = chunk.t.substring(1, chunk.t.length);
                        const plugin = plugins[name];
                        if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + name);
                        ret = [...ret, async (data: Data) => {
                            await on(plugin)(built)(data);
                        }];
                    }
                }
            }
        }
        return ret;
    }

    const s = (x: F|Tpipe|string) => {
        let built: Tpipe|F;
        if(typeof x === 'string')
            built = build([x]);
        else
            built = x;
        return async (data: Data) => await serial(built, data.ctx);
    };

    const serial: Serial = async(tasks, ctx) => {
        let ok = false;
        const data = {
            data: null,
            ctx: ctx//  || {}
        };

        let quit;
        if(ctx) quit = ctx.quit;

        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }
        let throws = false;
        let question = false;
        let notR = false;
        try{
            for(let t of tasks){
                throws = false;
                question = false;
                notR = false;
                if(typeof t === 'function'){
                    try{
                        data.data = await t(data);
                    }catch(err){
                        console.log('catch 0');
                        console.log(tasks, err instanceof Error && err.message);
                        if(tasks.at(-1) === '?') throw new Error('Stop');
                        throw err;
                    }
                }
                else if(typeof t === 'string'){
                    if(t !== 'throws' && t !== '?'){
                        if(!t.includes("|") && !t.includes("[")){
                            if(t.charAt(t.length-1) === "!"){
                                throws = true;
                                t = t.substring(0, t.length-1);
                            }
                            if(t.charAt(t.length-1) === "?"){
                                question = true;
                                t = t.substring(0, t.length-1);
                            }
                            if(t.charAt(0) === '^'){
                                t = t.substring(1);
                                notR = true;
                            }
                            const m = namespace[t];
                            if(m === undefined) throw new Error("Key Error: namespace error: " + t + ",(it could be a missing plugin)");
                            if(typeof m === 'function'){
                                try{
                                    if(notR){
                                        data.data = await nr(m)(data);
                                    }
                                    else{
                                        data.data = await m(data);
                                    }                                    
                                }catch(err){
                                    console.log('catch 1');
                                    console.log(tasks, err instanceof Error && err.message);
                                    if(tasks.at(-1) === '?') throw new Error('Stop');
                                    else if(!question) throw err;                                    
                                    return false;
                                }
                            }else{
                                try{
                                    let response: {done?: boolean, value: any};
                                    if(notR){
                                        response = await nr((data: Data)=>m.next(data))(data);
                                    }else{
                                        response = await m.next(data);
                                    }
                                    data.data = response.value;
                                    if(dev) path.push(response.value);
                                    if(response.done && quit) quit(false, response.value);    
                                }catch(err){
                                    console.log('catch 2');
                                    console.log(tasks, err instanceof Error && err.message);
                                    if(DEBUG.v)
                                        // eslint-disable-next-line no-console
                                        console.log(err);                                    
                                    let message = 'Unknown Error';
                                        if(err instanceof Error) message = err.message;
                                    if(dev) path.push(message);
                                    if(tasks.at(-1) === '?') throw new Error('Stop');
                                    else if(!question){
                                        if(quit) quit(true);
                                        throw err;
                                    } 
                                    return false;
                                }                            
                            }
                        }else{
                            const f = _t(t);
                            if(f !== null){
                                try{
                                    data.data = await f(data);
                                }catch(err){
                                    console.log('catch 3');
                                    console.log(tasks, err instanceof Error && err.message);
                                    if(tasks.at(-1) === '?') throw new Error('Stop');
                                    throw err;
                                }
                            }
                        }
                    }                    
                }
                else if(Array.isArray(t)){
                    try{
                        await serial(t, data.ctx);
                    }catch(err){
                        console.log('catch 4');
                        console.log(tasks, err instanceof Error && err.message);
                        if(tasks.at(-1) === '?') throw new Error('Stop');
                    }
                }
                else{
                    try{
                        const x = await t.next(data);
                        data.data = x.value;
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit(false, x.value);
                    }catch(err){
                        console.log('catch 5');
                        console.log(tasks, err instanceof Error && err.message);
                        if(DEBUG.v)
                            // eslint-disable-next-line no-console
                            console.log(err);
                        if(dev) path.push('throws');
                        if(quit) quit(true);
                        throw err;
                    }                                               
                } 
            }
            ok = true;
        }catch(err){
            console.log('catch final');
            console.log(tasks, err instanceof Error && err.message);
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            if(quit) quit(true);
            if(tasks.at(-1) === 'throws' || throws && tasks.at(-1) !== '?'){    
                throw err;
            }
            else{
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
            }
            throw err;
        }
        return ok;
    };

    function _t(t: string){
        const {parsed} = parse(t, ['nr', 'p', ...Object.keys(plugins)]);
        const b = build(parsed);
        if(b) return (data: Data)=>serial(b, data.ctx);
        else return null;
    }

    const emptyCtx = {ctx: {quit: ()=>false}};

    const plugs: {[key: string]: (arg0: F|Tpipe|string) => (data?: Data)=> Promise<any>} = {};
    for(const key of Object.keys(plugins)){
        const plugin = plugins[key];
        const x = on(plugin);
        plugs[key] = (pipe: F|Tpipe|string) => async (data?: Data) => {
            await x(pipe)(data?data:emptyCtx);
        };
    }

    const p = (pipe: F|Tpipe|string) => (data?: Data) => {
        return on(parallel())(pipe)(data?data:emptyCtx);
    };

    plugs.serial = (pipe: F|Tpipe|string) => async (data?: Data) => {
        try{
            return await serial(pipe, data?data.ctx:emptyCtx.ctx);
        }catch(err){
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            return false;
        }
    };

    plugs.p = p;

    const nr = (pipe: F|Tpipe|string) => (data?: Data) => {
        return on(_nr)(pipe)(data?data:emptyCtx);
    };

    plugs.nr = nr;

    return plugs;
}