import { type Namespace, type Plugin, type FD } from '.';
import { parse, ParsedArray, ParsedAtom } from './parse';
import genPipe from './pipe';

import p from './parallel';
import nr from './nr';
import retry from './retry';
import repeat from './repeat';


export default (raw: string, namespace: Namespace, plugins: Plugin, dev: boolean, path: {v: string}) => {
    
    plugins = {...plugins, nr: nr(), p: p()};

    const rootParsed = parse(raw, Object.keys(plugins));
    
    function _compile(parsed: ParsedArray){
    
        const s = genPipe(dev, path);

        function builtinPlugins(m: ParsedArray, f: FD){
            if(m.retry)
                f = retry(m.retry)([f]);
            if(m.nr)
                f = nr()([f]);
            if(m.repeat)
                f = repeat(m.repeat)([f]);
            return f;
        }

        function getPlugin(m: ParsedArray|ParsedAtom){
            if(m.plugin === 's')
                return s;
            else if(m.plugin === 'p'){
                return p();
            }
            else{
                if(m.plugin){
                    const plugin = plugins[m.plugin];
                    if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + m.plugin);
                    return plugin;
                }else{
                    return null;
                }
            }
        }

        const buildAtom = (a: string) => {
            const m = namespace[a];
            if(m === undefined) 
                throw new Error("Key Error: namespace error: " + m + ",(it could be a missing plugin)");
            return m;
        };

        function build(arr: ParsedArray): FD{
            let plugin;            
            const ret: (FD|Generator|AsyncGenerator)[] = [];

            for(const m of arr.c){
                let f: FD|Generator|AsyncGenerator;

                if(m.type === 'atom'){
                    f = buildAtom(m.name);
                }else if(Array.isArray(m)){
                    plugin = getPlugin(arr);
                    if(plugin) f = plugin(m);
                    else f = s(m);
                    f = builtinPlugins(m, f);
                }else{
                    f = build(m);
                    plugin = getPlugin(m);
                    if(plugin) plugin([f]);
                    f = builtinPlugins(m, f);
                }
                ret.push(f);
            }
            return s(ret);
        }
        return build(parsed);
    }
    return _compile(rootParsed);
};
