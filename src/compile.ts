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
                    return s;
                }
            }
        }

        const buildAtom = (a: string) => {
            const m = namespace[a];
            if(m === undefined) 
                throw new Error("Key Error: namespace error: " + m + ",(it could be a missing plugin)");
            return m;
        };

        const buildArray = (arr: ParsedArray):FD => {
            const plugin = getPlugin(arr);

            const pipes = (arr.c.map(sub=>{
                if(sub.type === 'array'){
                    let f = buildArray(sub);
                    if(arr.retry)
                        f = retry(arr.retry)([f]);
                    if(arr.nr)
                        f = nr()([f]);
                    if(arr.repeat)
                        f = repeat(arr.repeat)([f]);  
                    return f;
                }else{
                    return s([buildAtom(sub.name)]);
                }
            }));
            return plugin(pipes);
        };

        function build(arr: ParsedArray): FD{
            return buildArray(arr);
        }
        return build(parsed);
    }
    return _compile(rootParsed);
};
