import { parse, type Parsed} from './parse';
import p from './parallel';
import nr from './nr';

export {default as w, SHOW_QUIT_MESSAGE} from './watch';
export {default as p} from './parallel';
export {default as sw} from './switch';
export {default as nr} from './nr';

export const DEBUG = {v: false, w: false};

export type Data = {data?: any, ctx: Ctx};
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];

export type BUILD = (t: (string|Parsed)[]) => Tpipe;
export type FD = (data: Data)=>Promise<any>;
export type SETUP = {single: FD, multiple: FD[]};
export type FSETUP = (arg: SETUP) => FP;
export type FP = (pipe: Tpipe|F) => (data?: Data) => Promise<any>;

type Serial = (tasks: Tpipe|C, data: Data) => Promise<any>;
type Serialv2 = (tasks: string, data: Data) => Promise<any>;

export type NR = (f: F) => (data?: Data) => Promise<any>;
type Plugin = {[key: string]: (arg: SETUP) => FD};
type CompiledPlugin = {[key: string]: (arg0: F|Tpipe|string) => FD};

type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;
export type Quit = (err?: boolean, data?: any)=>boolean;
export type Ctx = {quit: Quit, promise?: Promise<any>};

export function *g(arr: string[]){
    for(const i of arr){
        if(i.startsWith('throw') || i.endsWith('!')) throw new Error(i);
        else yield i;
    }
}

export function i(data: any=null){
    return {data: data, ctx: {quit: ()=>{
        return true;
    }}};
}

const splitAndFilter = (t: string, sep='|') => t.split(sep).filter(y => y !== "");

export const dev = (path: string[]) => (namespace: Namespace, plugins?: Plugin) => context(namespace, plugins, true, path);

export function context(namespace: Namespace={},
                        plugins: Plugin={}, 
                        dev=false, 
                        path: string[]=[]
                    ){

    plugins = {...plugins, nr: nr(), p: p()};

    function build(parsed: (string|Parsed)[]): Tpipe{
        let ret: Tpipe = [];
        
        for(const chunk of parsed){
            if(typeof chunk === 'string'){
                if(chunk.includes(',')){
                    const several =  splitAndFilter(chunk, ',');
                    const funcs = several.map(x => {
                        if(x.startsWith('^')){
                            x = x.substring(1);
                            if(x.includes('|')){
                                const func = plugs.nr(splitAndFilter(x));
                                return func;
                            }else{
                                const func = plugs.nr(x);
                                return func;
                            }
                        }
                        else{
                            if(x.includes('|')) return splitAndFilter(x);
                            else return x;
                        }
                    });
                    ret = [...ret, ...funcs];
                }else if(chunk.includes('|')){
                    ret = [...ret, ...splitAndFilter(chunk)];
                }else{
                    ret = [...ret, chunk];
                }
            }else{
                if(chunk.t === '^[' || chunk.t === '|.'){
                    const built = build(chunk.c);
                    const func = plugs.nr(s(built));
                    ret = [...ret, func];
                }
                else if(chunk.t === '['){
                    const func = s(build(chunk.c));
                    ret = [...ret, func];
                }
                else if(chunk.t.startsWith("*")){ 
                    const built = build(chunk.c);
                    const name = chunk.t.substring(1, chunk.t.length);
                    const builtin = plugs[name];
                    if(builtin === undefined) throw new Error("Key Error: plugin namespace error: " + name);
                    const func = builtin(built);
                    ret = [...ret, func];
                }
            }
        }
        return ret;
    }

    const s = (built: F|Tpipe) => (data: Data) =>_serial(built, data);

    const serial: Serialv2 = async(tasks, data) => {
        const {parsed} = parse(tasks, Object.keys(plugins));
        const b = build(parsed);
        return _serial(b, data);
    };

    const _serial: Serial = async(tasks, data) => {

        let quit;
        if(data.ctx) quit = data.ctx.quit;

        if(!Array.isArray(tasks)){
            tasks = [tasks, 'throws'];
        }
        let throws = false;
        let question = false;
        try{
            for(let t of tasks){
                throws = false;
                question = false;
                try{
                    let m: C;
                    if(typeof t === 'string'){
                        if(t === 'throws' || t === '?') continue;
                        if(t.charAt(t.length-1) === "!"){
                            throws = true;
                            t = t.substring(0, t.length-1);
                        }
                        if(t.charAt(t.length-1) === "?"){
                            question = true;
                            t = t.substring(0, t.length-1);
                        }
                        m = namespace[t];
                        if(m === undefined) throw new Error("Key Error: namespace error: " + t + ",(it could be a missing plugin)");
                    }else{
                        m = t;
                    }
                    if(typeof m === 'function'){
                        data.data = await m(data);
                    }else if(Array.isArray(m)){
                        await _serial(m, data);
                    }else{
                        const response = await m.next(data);
                        data.data = response.value;
                        if(dev) path.push(response.value);
                        if(response.done && quit) quit(false, response.value);                                                            
                    }
                }catch(err){
                    if(err instanceof Error && !err.message.startsWith("?")) throw err;
                    data.data = null;
                    continue;
                }
            }
            return data.data;
        }catch(err){
            if(DEBUG.v)
                // eslint-disable-next-line no-console
                console.log(err);
            if(quit) quit(true);
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            if(dev && err instanceof Error && !err.message.startsWith("no log")){
                path.push(err instanceof Error? err.message: "unknown error");
            } 
            if(tasks.at(-1) === '?' || question) throw new Error('?');
            if(tasks.at(-1) === 'throws' || throws){
                if(err instanceof Error && (err.message.startsWith("throw") || err.message.endsWith("!"))){
                    throw new Error('no log:' + err.message);
                }
            }
            return null;
        }
    };

    const plugs: CompiledPlugin = {};

    for(const key of Object.keys(plugins)){
        const plugin = plugins[key];
        plugs[key] = (pipe: F|Tpipe|string) => {
            let built: F|Tpipe;
        
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
            return plugin({single, multiple});
        };
    }

    return async (t: string, data?: any) => {
        try{
            const v = i(data?data:null);
            return await serial(t, v);
        }catch(err){
            if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
            return false;
        }
    };
}
