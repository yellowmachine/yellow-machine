import { parse, type Parsed} from './parse';
import parallel from './parallel';
import _nr from './nr';
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
type FD = ()=>Promise<any>;
export type SingleOrMultiple = {single: FD, multiple: FD[]};
type SETUP = (arg: SingleOrMultiple) => Promise<any>;
type TON = {setup: SETUP, close?: Quit};
export type S = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type P = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type NR = (f: F) => (data?: Data) => Promise<any>;

type FTON = () => TON;
type Plugin = {[key: string]: FTON};

type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;

type Quit = (err?: boolean, data?: any)=>void;
export type Ctx = {quit: Quit};

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

            if(typeof pipe === 'string') 
                built = build([pipe]);
            else
                built = pipe;
            const single = async () => {
                const previousClose = data.ctx?data.ctx.quit:null;
                const backClose = () => {
                    if(close) close();
                    if(previousClose) previousClose();
                };
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
                    const previousClose = data.ctx?data.ctx.quit:null;
                    const backClose = () => {
                        if(close) close();
                        if(previousClose) previousClose();
                    };
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
            await setup({single, multiple});
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
                        if(x.includes('|')) return x.split('|').filter(y => y !== "");
                        else return x;
                    });
                    ret = [...ret, ...aux2];
                }else if(chunk.includes('|')){
                    ret = [...ret, ...chunk.split("|").filter(x => x !== "")];
                }else{
                    ret = [...ret, chunk];
                }
            }else{
                if(chunk.t === '['){
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
                        const plugin = plugins[chunk.t.substring(1, chunk.t.length)];
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
        try{
            for(let t of tasks){
                throws = false;
                if(typeof t === 'function'){
                    const x = await t(data);
                    data.data = x;
                }
                else if(typeof t === 'string'){
                    if(t !== 'throws'){
                        if(!t.includes("|") && !t.includes("[")){
                            if(t.charAt(t.length-1) === "!"){
                                throws = true;
                                t = t.substring(0, t.length-1);
                            }
                            const m = namespace[t];
                            if(typeof m === 'function'){
                                data.data = await m(data);
                            }else{
                                try{
                                    const x = await m.next(data);
                                    data.data = x.value;
                                    if(dev) path.push(x.value);
                                    if(x.done && quit) quit(false, x.value);
                                }catch(err){
                                    if(DEBUG.v)
                                        // eslint-disable-next-line no-console
                                        console.log(err);                                    
                                    let message = 'Unknown Error';
                                        if(err instanceof Error) message = err.message;
                                    if(dev) path.push(message);
                                    if(quit) quit(true);
                                    throw err;
                                }                            
                            }
                        }else{
                            const f = _t(t);
                            if(f !== null){
                                data.data = await f(data);
                            }
                        }
                    }                    
                }
                else if(Array.isArray(t)){
                    await serial(t, data.ctx);
                }
                else{
                    try{
                        const x = await t.next(data);
                        data.data = x.value;
                        if(dev) path.push(x.value);
                        if(x.done && quit) quit(false, x.value);
                    }catch(err){
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
            if(quit) quit(true);
            if(tasks.at(-1) === 'throws' || throws){     
                throw err;
            }
            else{
                if(DEBUG.v)
                    // eslint-disable-next-line no-console
                    console.log(err);
            }
        }
        return ok;
    };

    function _t(t: string){
        const {parsed} = parse(t, ['nr', 'p', ...Object.keys(plugins)]);
        const b = build(parsed);
        if(b) return (data: Data)=>serial(b, data.ctx);
        else return null;
    }

    const emptyCtx = {ctx: {quit: ()=>undefined}};

    const plugs: {[key: string]: (arg0: F|Tpipe|string) => (data?: Data)=> Promise<any>} = {};
    for(const key of Object.keys(plugins)){
        const plugin = plugins[key];
        const x = on(plugin);
        plugs[key] = (pipe: F|Tpipe|string) => async (data?: Data) => {
            await x(pipe)(data?data:emptyCtx);
        };
        //const x = on(plugins[key]);
        //plugs[key] = (pipe: F|Tpipe|string) => (data?: Data) => x(pipe)(data?data:emptyCtx);
    }

    const p = (pipe: F|Tpipe|string) => (data?: Data) => {
        return on(parallel())(pipe)(data?data:emptyCtx);
    };

    plugs.serial = (pipe: F|Tpipe|string) => (data?: Data) => {
        return serial(pipe, data?data.ctx:emptyCtx.ctx);
    };

    plugs.p = p;

    const nr = (pipe: F|Tpipe|string) => (data?: Data) => {
        return on(_nr)(pipe)(data?data:emptyCtx);
    };

    plugs.nr = nr;

    return plugs;
}