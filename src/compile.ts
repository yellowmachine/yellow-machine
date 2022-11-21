import { type Namespace, type Plugin, type FD } from '.';
import { parse, type Parsed } from './parse';
import genPipe from './pipe';

import p from './parallel';
import nr from './nr';
import retry from './retry';
import repeat from './repeat';

export default (raw: string, namespace: Namespace, plugins: Plugin, dev: boolean, path: string[]) => {
    
    plugins = {...plugins, nr: nr(), p: p()};

    const rootParsed = parse(raw, Object.keys(plugins));
    
    function _compile(parsed: Parsed){
    
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

        function build(x: Parsed): FD{
            let plugin;

            if(x.plug === 's')
                plugin = s;
            else{
                plugin = plugins[x.plug || ''];
                if(plugin === undefined) throw new Error("Key Error: plugin namespace error: " + x.plug);
            }
            
            const ret: FD[] = [];
            for(const m of x.c){
                let f: FD;
                if(typeof m === 'string'){
                    f = s(buildString(m));
                }else{
                    f = build(m);
                }
                if(x.retry)
                    f = retry(x.retry)([f]);
                if(x.nr)
                    f = nr()([f]);
                if(x.repeat)
                    f = repeat(x.repeat)([f]);
                ret.push(f);
            }

            return plugin(ret);
        }
        return build(parsed);
    }
    return _compile(rootParsed);
};
