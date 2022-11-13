import { Parallel, Serial, Tpipe, Data, F } from ".";

type B = (string|B|P)[]|undefined;
type P = {p?: B, w?: {files: string[], pipe: B}};

export const build = (obj: {serial?: B, parallel?: B}, 
                     {serial, parallel, p, w}: 
                            {serial: Serial, 
                             parallel: Parallel, 
                             w: (files: string[],f: Tpipe|F) => () => Promise<any>,
                             p: (arg: Tpipe) => (data: Data)=>Promise<any>}) => {

    function x(tasks: B, ret: Tpipe){
        if(tasks === undefined) return ret;
        for(const t of tasks){
            if(t !== undefined){
                if(Array.isArray(t)){
                    ret.push(x(t, []));
                }else if(typeof t === 'string'){
                    ret.push(t);
                }else{
                    if(t.p){
                        const pipe = x(t.p, []);
                        ret.push(p(pipe));
                    }else if(t.w){
                        const pipe = x(t.w.pipe, []);
                        ret.push(w(t.w.files, pipe));
                    }
                    
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

function nextToken(t: string){
    if(t === "") return null;

    if(t.charAt(0) === '],')
        return {token: "],", remaining: t.substring(2)};
    else if(t.charAt(0) === ',')
        return {token: ",", remaining: t.substring(1)};
    else if(t.charAt(0) === '[')
        return {token: "[", remaining: t.substring(1)};
    else if(t.charAt(0) === ']')
        return {token: "]", remaining: t.substring(1)};
    else if(t.startsWith("p["))
        return {token: "p[", remaining: t.substring(2)};
    else if(t.startsWith("w_")){
        for(let i=0; i < t.length; i++){
            if(t.charAt(i) === "[")
                return {token: t.substring(0, i), remaining: t.substring(i+1)};
        }
        throw new Error("] not found");
    }else{
        for(let i=0; i < t.length; i++){
            if([",", "[", "]"].includes(t.charAt(i)))
                return {token: t.substring(0, i), remaining: t.substring(i)};
            if(t.substring(i).startsWith("|w_"))
                return {token: t.substring(0, i), remaining: t.substring(i+1)};
            if(t.substring(i).startsWith("|p["))
                return {token: t.substring(0, i), remaining: t.substring(i+1)};
        }
        return {token: t, remaining: ""};
        //throw new Error("| or [ or ] not found");
    }
}

function nextState(state: string, token: string){
    return state;
}

function lastState(state: Record<string, string[]>[]){
    return state[state.length - 1];
}

function appendToLastState(state: Record<string, string[]>[], item: string){
    const s = lastState(state);
    s[Object.keys(s)[0]].push(item);
}

type Parsed = {type: string, container: (Parsed|string)[]};

export function parsev2(t: string){
    let remaining = t;
    
    const pending: (Parsed|string)[] = [];
    for(;;){
        const token = nextToken(remaining);
        if(token === null) break;
        remaining = token.remaining;
        if(!["],", ",", "[", "]", "p["].includes(token.token) && !token.token.startsWith("w_")){
            pending.push(token.token);
        }else if(token.token === "p["){
            const aux = parsev2(remaining);
            pending.push({type: "p[", container: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === '['){
            const aux = parsev2(remaining);
            pending.push({type: "[", container: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token.startsWith("w_")){
            const aux = parsev2(remaining);
            pending.push({type: "w[", container: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === "," || token.token === "]," || token.token === "]" || remaining === ""){   
            break;
        }
    }
    return {remaining, parsed: pending};
}

export function parse(t: string, namespace: Record<string, string[]>={}): {remaining: string, parsed: B}{

    let parsed: B = [];
    let partial = "";
    let i = -1;
    for(;;){
        i = i + 1;
        const c = t.substring(i, i+1);
        const next = t.substring(i+1, i+2);
        if(c === 'w' && next === "_"){
            const j = t.indexOf("[");
            const w_name = t.substring(0, j);
            const w = namespace[w_name];
            const {remaining, parsed: _parsed} = parse(t.substring(j));
            parsed.push({w: {files: w, pipe: _parsed}});
            t = remaining;
            i = -1;
            partial = "";
        }
        else if(c === 'p' && next === "["){
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