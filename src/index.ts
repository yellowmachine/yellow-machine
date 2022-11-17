import { parse, type Parsed} from './parse';
import parallel from './parallel';
import _nr from './nr';
import _sw from './switch';

export {default as watch, SHOW_QUIT_MESSAGE} from './watch';
export {default as parallel} from './parallel';
export {default as notReentrant} from './nr';

export function *g(arr: string[]){
    for(const i of arr){
        console.log(i);
        if(i.startsWith('throw') || i.endsWith('!')) throw new Error(i);
        else yield i;
    }
}

export const DEBUG = {v: false, w: false};

export type Data = {data?: any, ctx: Ctx};
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
//export type Serial = (tasks: Tpipe|C, ctx: Ctx) => Promise<any>;
//export type Parallel = (tasks: Tpipe|C, mode?: "all"|"race"|"allSettled", ctx?: Ctx) => Promise<any>;
export type BUILD = (t: (string|Parsed)[]) => Tpipe;
export type FD = (data: Data)=>Promise<boolean>;
export type SETUP = {single: FD, multiple: FD[]};
export type FSETUP = (arg: SETUP) => FP;
export type FP = (pipe: Tpipe|F) => (data?: Data) => Promise<any>;
//type S = (pipe: Tpipe) => (data?: Data) => Promise<any>;
//type P = (pipe: Tpipe) => (data?: Data) => Promise<any>;
export type NR = (f: F) => (data?: Data) => Promise<any>;
type Plugin = {[key: string]: (arg: SETUP) => FD};
type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;
export type Quit = (err?: boolean, data?: any)=>boolean;
export type Ctx = {quit: Quit};

export function i(data=null){
    return {data, ctx: {quit: ()=>true}};
}

export const dev = (path: string[]) => (namespace: Namespace, plugins?: Plugin) => context(namespace, plugins, true, path);

export function context(namespace: Namespace={},
                        plugins: Plugin={}, 
                        dev=false, 
                        path: string[]=[]
                    ){

    function buildSingleMultiple(pipe: F|Tpipe|string){
        let built: F|Tpipe;

        console.log('build single multiple', pipe);
    
        if(typeof pipe === 'string') 
            built = build([pipe]);
        else
            built = pipe;
        const single = s(built);
        
        let multiple: FD[] = [];
        if(Array.isArray(built)){
            multiple = built.map(x => {
                let func;
                if(Array.isArray(x))
                    func = s(x);
                else
                    func = s([x]);
                return func;
                
            });
        }
        return {single, multiple};
    }

    function build(parsed: (string|Parsed)[]): Tpipe{
        console.log('nos piden build de', parsed);
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
                                const func = nr(x.split('|').filter(y => y !== ""));
                                return func;
                            }else{
                                const func = nr(x);
                                return func;
                            }
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
                    const func = nr(build(chunk.c));
                    ret = [...ret, func];
                }
                else if(chunk.t === '['){
                    const func = s(build(chunk.c));
                    ret = [...ret, func];
                }else if(chunk.t.startsWith("*")){ 
                    const built = build(chunk.c);
                    if(chunk.t === '*p'){
                        const func = nr(built);
                        ret = [...ret, func];
                    }
                    else if(chunk.t === '*nr'){
                        const func = nr(built);
                        ret = [...ret, func];
                    }
                    else if(plugins){
                        const name = chunk.t.substring(1, chunk.t.length);
                        const plugin = plugins[name];
                        if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + name);
                        const {single, multiple} = buildSingleMultiple(built);
                        const func = plugin({single, multiple});
                        ret = [...ret, func];
                    }
                }
            }
        }
        return ret;
    }

    const s = (x: F|Tpipe|string) => {
        let built: Tpipe|F;
        if(typeof x === 'string'){
            built = build([x]);
        }
        else
            built = x;
        return async (data: Data) => await serial(built, data.ctx);
    };

    const serialv2: (tasks: Tpipe|C, ctx: Ctx) => Promise<any> = async(tasks, ctx) => {
        if(typeof tasks === 'string'){
            const {parsed} = parse(tasks, ['nr', 'p', ...Object.keys(plugins)]);
            const b = build(parsed);
            return serial(b, ctx);
        }
    };

    const serial: (tasks: Tpipe|C, ctx: Ctx) => Promise<any> = async(tasks, ctx) => {
        const data = {
            data: null,
            ctx: ctx
        };

        console.log('******************* tasks', tasks);

        let quit;
        if(ctx) quit = ctx.quit;

        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }
        let throws = false;
        let question = false;
        let dontReentrate = false;
        try{
            for(let t of tasks){
                throws = false;
                question = false;
                dontReentrate = false;
                if(typeof t === 'function'){
                    data.data = await t(data);
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
                                dontReentrate = true;
                            }
                            const m = namespace[t];
                            if(m === undefined) throw new Error("Key Error: namespace error: " + t + ",(it could be a missing plugin)");
                            if(typeof m === 'function'){
                                if(dontReentrate){
                                    await nr(m)(data);
                                    //data.data = await nr(m)(data);
                                }
                                else{
                                    data.data = await m(data);
                                }                                    
                            }else{
                                //let response: {done?: boolean, value: any};
                                //if(dontReentrate){
                                //    response = await nr((data: Data)=>m.next(data))(data);
                                //}else{
                                const response = await m.next(data);
                                data.data = response.value;
                                //}
                                if(dev) path.push(response.value);
                                if(response.done && quit) quit(false, response.value);                                                            
                            }
                        }else{
                            //const f = _t(t);
                            //if(f !== null){
                            //    data.data = await f(data);
                            //}
                        }
                    }                    
                }
                else if(Array.isArray(t)){
                    await serial(t, data.ctx);
                }
                else{
                    const x = await t.next(data);
                    data.data = x.value;
                    if(dev) path.push(x.value);
                    if(x.done && quit) quit(false, x.value);                                               
                }    
                
            }
            return true;
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            if(dev && err instanceof Error && err.message !== "no log") 
                path.push(err instanceof Error? err.message: "unknown error");
            if(tasks.at(-1) === '?') return false;
            else if(!question){
                if(quit) quit(true);
                if(err instanceof Error && (err.message.startsWith("throw") || err.message.endsWith("!")))
                    throw new Error('no log');
                else    
                    throw err;
            } 
            if(tasks.at(-1) === 'throws' || throws && tasks.at(-1) !== '?'){    
                throw err;
            }
            return false;
        }
    };
    
    /*function _t(t: string){
        const {parsed} = parse(t, ['nr', 'p', ...Object.keys(plugins)]);
        const b = build(parsed);
        if(b) return (data: Data)=>serial(b, data.ctx);
        else return null;
    }*/

    const emptyCtx = {ctx: {quit: ()=>false}};

    const plugs: {[key: string]: (arg0: F|Tpipe|string) => (data: Data)=> Promise<any>} = {};
    
    for(const key of Object.keys(plugins)){
        const plugin = plugins[key];
        plugs[key] = (pipe: F|Tpipe|string) => {
            const {single, multiple} = buildSingleMultiple(pipe);
            return (data: Data) => {
                return plugin({single, multiple})(data);
            };        
        };
    }

    const p = (pipe: F|Tpipe|string) => {
        const {single, multiple} = buildSingleMultiple(pipe);
        return (data: Data) => {
            return parallel()({single, multiple})(data);
        };
    };

    plugs.serial = (pipe: F|Tpipe|string) => async (data?: Data) => {
        try{
            return await serial(pipe, data?data.ctx:emptyCtx.ctx);
        }catch(err){
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            return false;
        }
    };

    plugs.serialv2 = (pipe: F|Tpipe|string) => async (data?: Data) => {
        try{
            return await serialv2(pipe, data?data.ctx:emptyCtx.ctx);
        }catch(err){
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            return false;
        }
    };

    plugs.p = p;

    const nr = (pipe: F|Tpipe|string) => {
        const {single, multiple} = buildSingleMultiple(pipe);
        return (data: Data) => {
            return _nr()({single, multiple})(data);
        };
    };

    plugs.nr = nr;

    return plugs;
}