import { Parallel, Serial, Tpipe, Data } from ".";

type B = (string|B|P)[]|undefined;
type P = {p: B};

export const build = (obj: {serial?: B, parallel?: B}, 
                     {serial, parallel, p}: 
                            {serial: Serial, 
                             parallel: Parallel, 
                             p: (arg: Tpipe) => (data: Data, mode: "all"|"race"|"allSettled")=>Promise<any>}) => {

    function x(tasks: B, ret: Tpipe){
        if(tasks === undefined) return ret;
        for(const t of tasks){
            if(t !== undefined){
                if(Array.isArray(t)){
                    ret.push(x(t, ret));
                }else if(typeof t === 'string'){
                    ret.push(t);
                }else{
                    ret.push((data: Data, mode?: "all"|"race"|"allSettled") => 
                                                parallel(x(t.p, ret), mode, data.ctx));
                }
            }
        }
        return ret;
    }
    if(obj.serial) return () => serial(x(obj.serial, []));
    else if (obj.parallel) return () => parallel(x(obj.parallel, []));
};

export function parse(t: string): {remaining: string, parsed: B}{

    let parsed: B = [];
    let partial = "";
    let i = -1;
    for(;;){
        i = i + 1;
        const c = t.substring(i, i+1);
        const next = t.substring(i+1, i+2);
        if(c === 'p' && next === "["){
            parsed = [...partial.slice(0, -1).split("|"), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+2));
            parsed.push({p: _parsed});
            t = remaining;
            i = -1;
            partial = "";
        }
        else if( c === "["){
            parsed = [...partial.slice(0, -1).split("|"), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+1));
            parsed.push(_parsed);
            t = remaining;
            i = -1;
            partial = "";
        }else if(c === "]" || c === ""){
            parsed = [...parsed, ...partial.split("|"), ];
            break;
        }else{
            partial = partial + c;
        }
    }
    return {remaining: t.substring(2+partial.length), parsed};
}