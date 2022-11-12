import { Parallel, Serial, Tpipe, Data } from ".";

type B = (string|B|P)[]|undefined;
type P = {p: B};

export const build = (obj: {serial?: B, parallel?: B}, 
                     {serial, parallel, p}: 
                            {serial: Serial, 
                             parallel: Parallel, 
                             p: (arg: Tpipe) => (data: Data)=>Promise<any>}) => {

    function x(tasks: B, ret: Tpipe){
        if(tasks === undefined) return ret;
        for(const t of tasks){
            if(t !== undefined){
                if(Array.isArray(t)){
                    ret.push(x(t, ret));
                }else if(typeof t === 'string'){
                    ret.push(t);
                }else{
                    const pipe = x(t.p, []);
                    ret.push(p(pipe));
                }
            }
        }
        return ret;
    }
    if(obj.serial){
        const pipe = x(obj.serial, []);
        return () => serial(pipe);
    } 
    else if (obj.parallel){
        const pipe = x(obj.parallel, []);
        return () => parallel(pipe);
    }  
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
            if(partial != "")
                parsed = [...partial.split("|").filter(k => k !== ""), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+2));
            parsed.push({p: _parsed});
            t = remaining;
            i = -1;
            partial = "";
        }
        else if( c === "["){
            parsed = [...partial.split("|").filter(k => k !== ""), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+1));
            parsed.push(_parsed);
            t = remaining;
            i = -1;
            partial = "";
        }else if(c === "]" || c === ""){
            if(partial != "")
                parsed = [...parsed, ...partial.split("|").filter(k => k !== ""), ];
            break;
        }else{
            partial = partial + c;
        }
    }
    return {remaining: t.substring(1+partial.length), parsed};
}