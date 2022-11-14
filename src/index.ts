import { watch as chwatch } from 'chokidar';
import { emitKeypressEvents } from 'node:readline';
import { isArray } from 'node:util';
import { parse, type Parsed} from './parse';

emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

type RecordPlugin = {[key: string]: (({serial}:{serial: Serial})=>TON)};

let _plugins: RecordPlugin = {};

export function setPlugin(plug: RecordPlugin){
    _plugins = {..._plugins, ...plug};
}

export function *g(arr: string[]){
    for(const i of arr){
        if(i.startsWith('throw')) throw new Error(i);
        else yield i;
    }
}

export const DEBUG = {v: false};
export const SHOW_QUIT_MESSAGE = {v: false};

export type Data = {data?: any, ctx: Ctx};
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Serial = (tasks: Tpipe|C, ctx?: Ctx) => Promise<any>;
export type Parallel = (tasks: Tpipe|C, mode?: "all"|"race"|"allSettled", ctx?: Ctx) => Promise<any>;

export type BUILD = (t: (string|Parsed)[]) => Tpipe;
type SETUP = (arg: (data: Data)=>Promise<any>) => Promise<any>;
type TON = {setup: SETUP, close?: (()=>void)};
export type S = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type P = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type NR = (f: F) => (data?: Data) => Promise<any>;

type FTON = ({s, p, on, nr}:{s: S, p: P, on: MFTON, nr: NR }) => TON;
type MFTON = (f: FTON) => ((pipe: Tpipe) => (data: Data) => Promise<any>);
type Plugin = {[key: string]: FTON};

type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;

type Quit = (err?: boolean, data?: any)=>void;
type Ctx = {quit?: Quit}|null;

export const dev = (path: string[]) => (namespace: Namespace, plugins?: Plugin) => context(namespace, plugins, true, path);

export function context(namespace: Namespace,
                        plugins: Plugin={}, 
                        dev=false, 
                        path: string[]=[]
                    ){

    const on = (f: FTON): ((pipe: Tpipe|string) => (data: Data) => Promise<any>) => {
        const {setup, close} = f({s, p, on, nr});
        return (pipe: Tpipe|string) => async () => {
            let built: Tpipe;
            if(typeof pipe === 'string') 
                built = build([pipe]);
            else
                built = pipe;
            await setup(async (data: Data) => {
                try{
                    data = {...data, ctx:{quit: close}};
                    await s(built)(data);
                }catch(err){
                    if(close)close();
                }
                return true;
            });
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
                if(chunk.t === 'p['){
                    ret = [...ret, p(build(chunk.c))];
                }else if(chunk.t === '['){
                    ret = [...ret, ()=>serial(build(chunk.c))];
                }else if(chunk.t.startsWith("*")){ 
                    if(namespace.plugins){
                        const plugin = plugins[chunk.t.substring(1, chunk.t.length-1)];
                        const built = build(chunk.c);
                        ret = [...ret, (data: Data) => on(plugin)(built)(data)];
                    }
                }
            }
        }
        return ret;
    }

    function nr(f: F|Tpipe){
        let exited = true;
        return async function(data?: Data){
            if(exited){
                try{
                    exited = false;
                    return await serial(f, data?data.ctx:{});
                }catch(err){
                    if(DEBUG.v)
                        // eslint-disable-next-line no-console
                        console.log(err);
                    throw(err);
                }finally{
                    exited = true;
                }
            }
        };
    }

    const parallel: Parallel = async (tasks, mode="all", ctx=null) =>{
        const promises: Promise<any>[] = [];   

        const data = {
            data: null,
            ctx: ctx || {}
        };

        let quit;
        if(ctx) quit = ctx.quit;
    
        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }

        for(const t of tasks){
            if(typeof t === 'function'){
                promises.push(t({...data}));
            }else if(Array.isArray(t)){
                promises.push(serial(t, data.ctx));
            }else if(typeof t === 'string'){
                if(!t.includes("|") && !t.includes("[")){
                    const m = namespace[t];
                    if(typeof m === 'function'){
                        promises.push(m({...data}));
                    }else{
                        try{
                            const x = await m.next(data);
                            if(dev) path.push(x.value);
                            if(x.done && quit) quit(false, x.value);
                        }catch(err){
                            if(DEBUG.v)
                                // eslint-disable-next-line no-console
                                console.log(err);
                            let message = 'Unknown Error';
                                if(err instanceof Error) message = err.message;
                            if(dev) path.push(message);//'throws');
                            if(quit) quit(true);
                        }                    
                    }
                }else{
                    const f = _t(t);
                    if(f !== null){
                        promises.push(f());
                    }
                }
            }else{
                try{
                    const x = await t.next(data);
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
                }                
            } 
        }
        try{
            if(mode === "all") await Promise.all(promises);
            //else if (mode === "any") await Promise.any(promises);
            else if (mode === "race") await Promise.race(promises);
            else if (mode === "allSettled") await Promise.allSettled(promises);
        }catch(err){
            if(quit) quit(true);
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            throw err;
        }
        return true;
    };

    const p = (x: Tpipe|string) => {
        let built: Tpipe;
        if(typeof x === 'string')
            built = build([x]);
        else
            built = x;
        return (data?: Data) => parallel(built, "all", data?data.ctx:{});
    };

    const s = (x: Tpipe|string) => {
        let built: Tpipe;
        if(typeof x === 'string')
            built = build([x]);
        else
            built = x;
        return async (data?: Data) => await serial(x, data?data.ctx:{});
    };

    const serial: Serial = async(tasks, ctx=null) => {
        let ok = false;
        const data = {
            data: null,
            ctx: ctx  || {}
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
                            //if(!Array.isArray(f)){
                            if(f !== null){
                                data.data = await f();
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
        const {parsed} = parse(t, Object.keys(plugins));
        const b = build(parsed);
        if(b) return ()=>serial(b);
        else return null;
    }

    const emptyCtx = {ctx: {quit: ()=>undefined}};

    const plugs: {[key: string]: (arg0: Tpipe|string) => (data?: Data)=> Promise<any>} = {};
    for(const key of Object.keys(plugins)){
        const x = on(plugins[key]);
        plugs[key] = (pipe: Tpipe|string) => (data?: Data) => x(pipe)(data?data:emptyCtx);
    }

    plugs.serial = (pipe: Tpipe|string) => () => {
        return serial(pipe);
    };

    plugs.p = (pipe: Tpipe|string) => (data?: Data) =>{
        return p(pipe)(data?data:emptyCtx);
    };

    /*
    plugs.nr = (pipe: Tpipe, data?: Data) => {
        return nr(pipe)(data);
    };*/

    /*
    plugs.run = (t: string) => async () => {
        await serial(t);
    };
    */

    return plugs;
}