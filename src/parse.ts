type B = (string|B|P)[]|undefined;
type P = {p?: B, w?: {files: string[], pipe: B}};

export function nextToken(t: string, plugins: string[]){
    if(t === "") return null;

    if(/^\]\d*!/.test(t)){
        const match = t.match(/^(\]\d*!)/);
        const token = match ? match[0]:"]1!";
    
        return {token, remaining: t.substring(token.length)};
    }
    else if(t.startsWith("]!,"))
        return {token: "]!,", remaining: t.substring(3)};
    else if(t.startsWith("?"))
        return {token: "?", remaining: t.substring(1)};
    else if(t.startsWith("?,"))
        return {token: "?,", remaining: t.substring(2)};
    else if(t.startsWith('],'))
        return {token: "],", remaining: t.substring(2)};
    else if(t.startsWith('^['))
        return {token: "^[", remaining: t.substring(2)};
    else if(t.charAt(0) === '[')
        return {token: "[", remaining: t.substring(1)};
    else if(t.charAt(0) === ']')
        return {token: "]", remaining: t.substring(1)};
    else{
        for(let i=0; i < t.length; i++){
            if(["[", "]"].includes(t.charAt(i)) || t.substring(i).startsWith("^[")){
                const token = t.substring(0, i);
                for(const plug of plugins){
                    if(token.endsWith("|" + plug)){
                        const size = (plug).length;
                        return {token: t.substring(0, i-size), remaining: t.substring(i-size)};
                    }
                }
                if(t.charAt(i) === '^'){
                    return {token: "*"+token, remaining: t.substring(i)};
                }else{
                    if(plugins.includes(token) || /^\d+/.test(token)){
                        return {token: "*"+token, remaining: t.substring(i+1)};
                    }
                    else{
                        return {token, remaining: t.substring(i)};
                    }
                }
            }
        }
        return {token: t, remaining: ""};
    }
}

export type Parsed = {
    t: string, 
    plug?: string,
    retry?: number,
    nr?: boolean, 
    repeat?: number,
    c: (Parsed|string)[]
};

const removeWhite = (t: string) => t.replace(/\s/g,'');

const delimiters = ["^[", "?", "?,", "]!,", "],", "[", "]", "p["]; // remove "p["

const isDelimiter = (t: string) => {
    if(delimiters.includes(t)) return true;
    return /^\]\d+!/.test(t);
};

export const parse = (t: string, plugins: string[]) => {
    const parsed = _parse(removeWhite(t), plugins).parsed;
    return {
        t: "[",
        c: parsed,
    };
};   

function _parse(t: string, plugins: string[]){
    let remaining = t;
    let extra: string|null = null;
    
    let pending: (Parsed|string)[] = [];
    for(;;){
        const token = nextToken(remaining, plugins);

        if(token === null) break;
        remaining = token.remaining;

        if(!isDelimiter(token.token) && !token.token.startsWith("*")){
            let t = token.token;
            if(t.startsWith('|'))
                t = t.substring(1);
            if(t.charAt(t.length - 1) === "|")
                t = t.substring(0, t.length-1);
                pending.push(t);
            /*
            if(t.includes(',')){
                const aux = [];
                for(let t2 of t.split(',')){
                    if(t2.startsWith("^")){
                        t2 = t2.substring(1);
                        aux.push({t: "_[", plug: "nr", c: _parse(t2, plugins).parsed});    
                    }else{
                        //if(t2.includes("|.")){
                        //    t2 = t2.replace("|.", "|");
                        //    aux.push({t: "|.", c: _parse(t2, plugins).parsed});
                        //}else{
                        aux.push({t: "_[", plug: 's', c: _parse(t2, plugins).parsed});
                        //}
                    }        
                }
                pending.push({t: "_[[", c: aux});
            }else{
                if(t.startsWith("^")){
                    t = t.substring(1);
                    pending.push({t: "_[", plug: "nr", c: _parse(t, plugins).parsed});    
                }else{
                    //if(t.includes("|.")){
                    //    t = t.replace("|.", "|");
                    //    pending.push({t: "|.", c: [t]});
                    //}
                    //else
                    pending.push(t);
                }
            }*/
        }
        else if(token.token === "^["){
            const aux = _parse(remaining, plugins);
            pending.push({t: "[", plug: "nr", c: aux.parsed});
            remaining = aux.remaining;
        }
        else if(token.token === '^'){
            if(token.token.includes(',')){
                const c = remaining.split(',').map(x => _parse(x, plugins).parsed);
                c.forEach(x=>pending.push({t: "[", plug: "nr", c: x}));
            }else{
                const aux = _parse(remaining, plugins);
                pending.push({t: "[", plug: "nr", c: aux.parsed});
                remaining = aux.remaining;
            }
        }
        else if(token.token === '['){
            const aux = _parse(remaining, plugins);
            pending.push({t: "[", plug: "s", c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token.startsWith("*")){
            const aux = _parse(remaining, plugins);
            pending.push({t: "[", plug: token.token.substring(1), c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === "?" || token.token === "?,"){
            extra = "?";
            if(token.token.length == 2){
                break;
            }
        }else if(/^\]\d+!/.test(token.token)){
            const match = token.token.match(/^(\](\d+)!)/);
            const n = match?match[2]:'1';
            //pending.push('throws');
            pending = [{t: "[", retry: parseInt(n), c: pending}];
            break;
        }else if(token.token === "]!," || token.token === "]," || token.token === "]" || remaining === ""){   
            //if(token.token.includes("!"))
            //    pending.push("throws");
            break;
        }
    }
    if(extra) pending.push(extra);
    return {remaining, parsed: pending};
}
