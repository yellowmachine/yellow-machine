type B = (string|B|P)[]|undefined;
type P = {p?: B, w?: {files: string[], pipe: B}};

export function nextToken(t: string, plugins: string[]){
    if(t === "") return null;

    if(t.startsWith("]!"))
        return {token: "]!", remaining: t.substring(2)};
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
                    if(plugins.includes(token)){
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

export type Parsed = {t: string, c: (Parsed|string)[]};

const removeWhite = (t: string) => t.replace(/\s/g,'');

export function parse(t: string, plugins: string[]){
    t = removeWhite(t);
    let remaining = t;
    let extra: string|null = null;
    
    const pending: (Parsed|string)[] = [];
    for(;;){
        const token = nextToken(remaining, plugins);

        if(token === null) break;
        remaining = token.remaining;
        if(!["^[", "?", "?,", "]!", "]!,", "],", "[", "]", "p["].includes(token.token) && !token.token.startsWith("*")){
            let t = token.token;
            if(t.startsWith('|'))
                t = t.substring(1);
            if(t.charAt(t.length - 1) === "|")
                t = t.substring(0, t.length-1);
            if(t.includes(',')){
                for(let t2 of t.split(',')){
                    if(t2.startsWith("^")){
                        t2 = t2.substring(1);
                        pending.push({t: "*nr", c: parse(t2, plugins).parsed});    
                    }else{
                        //const xx = parse(t2, plugins).parsed;
                        pending.push({t: "[", c: parse(t2, plugins).parsed});
                    }        
                }
            }else{
                if(t.startsWith("^")){
                    t = t.substring(1);
                    pending.push({t: "*nr", c: [t]});    
                }else{
                    pending.push(t);
                }
            }
        }
        else if(token.token === "^["){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }
        else if(token.token === '^'){
            if(token.token.includes(',')){
                const c = remaining.split(',').map(x => parse(x, plugins).parsed);
                c.forEach(x=>pending.push({t: "[", c: x}));
            }else{
                const aux = parse(remaining, plugins);
                pending.push({t: token.token, c: aux.parsed});
                remaining = aux.remaining;
            }
        }
        else if(token.token === '['){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token.startsWith("*")){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === "?" || token.token === "?,"){
            extra = "?";
            if(token.token.length == 2){
                break;
            }
        }else if(token.token === "]!" || token.token === "]!," || 
                 token.token === "]," || token.token === "]" || remaining === ""){   
            if(token.token.includes("!"))
                pending.push("throws");
            break;
        }
    }
    if(extra) pending.push(extra);
    return {remaining, parsed: pending};
}
