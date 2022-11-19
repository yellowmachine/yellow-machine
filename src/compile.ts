import { type Namespace, type Data, type Plugin, type FD, type F } from '.';
import { parse, type Parsed } from './parse';
import genPipe, { type Tpipe } from './pipe';

import p from './parallel';
import nr from './nr';

type CompiledPlugin = {[key: string]: (arg0: F|Tpipe|string) => FD};

const splitAndFilter = (t: string, sep='|') => t.split(sep).filter(y => y !== "");

export default (raw: string, namespace: Namespace, plugins: Plugin, dev: boolean, path: string[]) => {
    
    plugins = {...plugins, nr: nr(), p: p()};
    const {parsed: rootParsed} = parse(raw, Object.keys(plugins));
    
    function _compile(parsed: (string|Parsed)[]): Tpipe{
    
        const s = genPipe(namespace, dev, path);
    
        function compilePlugins(){
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
            return plugs;
        }
        
        const plugs = compilePlugins();
        
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
        
        return build(parsed);
    }
    
    return _compile(rootParsed);
};
