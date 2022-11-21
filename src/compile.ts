import { type Namespace, type Plugin, type FD } from '.';
import { parse, ParsedArray } from './parse';
import genPipe from './pipe';

import p from './parallel';
import nr from './nr';
import retry from './retry';
import repeat from './repeat';

export default (raw: string, namespace: Namespace, plugins: Plugin, dev: boolean, path: string[]) => {
    
    plugins = {...plugins, nr: nr(), p: p()};

    const rootParsed = parse(raw, Object.keys(plugins));
    
    function _compile(parsed: ParsedArray){
    
        const s = genPipe(namespace, dev, path);

        const buildAtom = (a: string) => {
            const m = namespace[a];
            if(m === undefined) throw new Error("Key Error: namespace error: " + m + ",(it could be a missing plugin)");
            return m;
        };

        const buildString = (t: string) => {
            return t.split('|').
                filter(x=>x !== "").
                map(z => buildAtom(z));
        };

        function build(arr: ParsedArray): FD{
            let plugin;
            
            const ret: FD[] = [];

            for(const m of arr.c){
                let f: FD;

                //if(typeof m === 'string'){
                if(m.atom === 'atom'){
                    f = s(buildString(m.t));
                }else{
                    f = build(m);
                }
                if(m.retry)
                    f = retry(m.retry)([f]);
                if(m.nr)
                    f = nr()([f]);
                if(m.repeat)
                    f = repeat(m.repeat)([f]);
                
                if(m.plugin === 's')
                    plugin = s;
                else if(m.plugin === 'p')
                    plugin = p();
                else{
                    plugin = plugins[m.plugin || ''];
                    if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + m.plugin);
                }

                f = plugin([f]);
                ret.push(f);
            }
            return s(ret);
        }
        return build(parsed);
    }
    return _compile(rootParsed);
};
