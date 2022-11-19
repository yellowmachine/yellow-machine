import _compile from './compile';
import pipe from './pipe';
export {default as w, SHOW_QUIT_MESSAGE} from './watch';
export {default as p} from './parallel';
export {default as sw} from './switch';
export {default as nr} from './nr';
export {default as repeat} from './repeat';

export const DEBUG = {v: false, w: false};

export type Data = {data: any, ctx: Ctx};
export type F = ((arg0: Data) => any);

export type FD = (data: Data)=>Promise<any>;
export type SETUP = {single: FD, multiple: FD[]};
export type Plugin = {[key: string]: (arg: SETUP) => FD};
export type Namespace = Record<string,Generator|AsyncGenerator|((arg0: Data)=>any)>;
type Close = (err?: boolean, data?: any)=>boolean;
type Ctx = {close: Close, promise?: Promise<any>};

export function *g(arr: string[]){
    for(const i of arr){
        if(i.startsWith('throw') || i.endsWith('!')) throw new Error(i);
        else yield i;
    }
}

export function i(data: any=null){
    return {data: data, ctx: {close: ()=>{
        return true;
    }}};
}

type Options = {
    namespace: Namespace,
    plugins?: Plugin,
    dev?: boolean,
    path?: string[]
}

export const compile = (raw: string, options?: Options) => {
    const opts = {
        dev: false,
        path: [],
        plugins: {},
        namespace: {},
        ...options
    };
    
    const p = pipe(opts.namespace, opts.dev, opts.path);
    const compiled = _compile(raw, opts.namespace, opts.plugins, opts.dev, opts.path);
    return p(compiled);
};

export const run = async (raw: string, options?: Options, data?: Data) => {
    const opts = {
        dev: false,
        path: [],
        plugins: {},
        namespace: {},
        ...options
    };

    try{
        const p = pipe(opts.namespace , opts.dev, opts.path);
        const compiled = _compile(raw, opts.namespace || {}, opts.plugins||{}, opts.dev, opts.path);
        const v = i(data?data:null);
        return await p(compiled)(v);
    }catch(err){
        if(err instanceof Error && err.message.startsWith("Key Error")) throw err;
        return false;
    }
};

export const dev = (path: string[]) => (namespace: Namespace, plugins?: Plugin) => context(namespace, plugins, true, path);

export const context = (namespace: Namespace,
                        plugins?: Plugin, 
                        dev=false, 
                        path: string[]=[]
                    ) => (t: string, data?: any) => run(t, {namespace, plugins, dev, path}, data);
