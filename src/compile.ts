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

        const buildAtom = (a: string) => namespace[a];

        const buildString = (t: string) => {
            return t.split(',').
                filter(x=>x !== "").
                map(x=>{
                    if(x.startsWith('^')){
                        x = x.substring(1);
                        const a = x.split('|').filter(y=>y!=="").map(z=>buildAtom(z));
                        const b = [s(a)];
                        return nr()(b);
                    }else{
                        return x;
                    }
                });
        };

        function build(x: Parsed): FD{
            let plugin;

            if(x.plug !== 's')
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
