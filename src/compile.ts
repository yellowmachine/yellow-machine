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
    
    const plugins = {...opts.plugins, nr: nr(), p: p()};

    const rootParsed = parse(raw, Object.keys(plugins));
    
    function _compile(parsed: ParsedArray){

        function getPlugin(m: ParsedArray|ParsedAtom){
            if(m.plugin === 's')
                return s;
            else if(m.plugin === 'p'){
                return p();
            }
            else{
                if(m.plugin){
                    const plugin = opts.plugins[m.plugin];
                    if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + m.plugin);
                    return plugin;
                }else{
                    return s;
                }
            }
        }

        const buildAtom = (a: string) => {
            const m = opts.namespace[a];
            if(m === undefined) 
                throw new Error("Key Error: namespace error: " + a + ",(it could be a missing plugin)");
            return m;
        };

        const buildArray = (arr: ParsedArray):FD => {
            const plugin = getPlugin(arr);

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
                    return f;
                }
            }));
            return plugin(pipes);
        };

        function build(arr: ParsedArray): FD{
            return buildArray(arr);
        }
        return s([build(parsed)]);
    }
    return _compile(rootParsed);
};
