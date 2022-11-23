import { type Namespace, type Plugin, type FD, type Data } from '.';
import { parse, ParsedArray, ParsedAtom } from './parse';
import {pipe as s} from './pipe';

import p from './parallel';
import nr from './nr';
import retry from './retry';
import _catch from './catch';
import repeat from './repeat';

const wrap = (m: FD|AsyncGenerator|Generator) => {
    if(typeof m === 'function'){
        return async (data: Data) => {
            const response = await m(data);
            data.data = response;
            return response;
        };
    }else{
        return async (data: Data) => {
            const response = await m.next(data);
            data.data = response.value;
            return response.value;
        };                                                      
    }

};

export default (raw: string, opts: {namespace: Namespace, plugins: Plugin}) => {
    
    //const plugins = {...opts.plugins, nr: nr(), p: p()};

    const rootParsed = parse(raw);
    
    function _compile(parsed: ParsedArray){

        function composePlugins(plugins: string[]){
            if(plugins.length === 0) throw new Error("Internal error: no plugins.");
            return (f: FD[]) => {
                for(const name of plugins){
                    const plugin = opts.plugins[name];
                    if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + name);
                        f = [plugin(f)];     
                }
                return f[0];
            } ;
        }

        const buildAtom = (a: string) => {
            const m = opts.namespace[a];
            if(m === undefined) 
                throw new Error("Key Error: namespace error: " + a + ",(it could be a missing plugin)");
            return m;
        };

        const buildArray = (arr: ParsedArray):FD => {
            const composed = composePlugins(arr.plugins);

            const pipes = (arr.c.map(sub=>{
                if(sub.type === 'array'){
                    let f = buildArray(sub);
                    if(arr.retryCatch)
                        f = _catch(arr.retryCatch)([f]);
                    if(arr.retryThrow)
                        f = retry(arr.retryThrow)([f]);
                    if(arr.nr)
                        f = nr()([f]);
                    if(arr.repeat)
                        f = repeat(arr.repeat)([f]);
                    return f;
                }else{
                    const f = wrap(buildAtom(sub.name));
                    if(sub.catched) _catch(1)([f]);
                    const composed = composePlugins(sub.plugins);
                    return composed([f]);
                }
            }));

            return composed(pipes);
        };

        function build(arr: ParsedArray): FD{
            return buildArray(arr);
        }
        return s([build(parsed)]);
    }
    return _compile(rootParsed);
};
