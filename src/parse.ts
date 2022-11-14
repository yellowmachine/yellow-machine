type B = (string|B|P)[]|undefined;
type P = {p?: B, w?: {files: string[], pipe: B}};

function nextToken(t: string, plugins: string[]){
    if(t === "") return null;

    if(t.startsWith("]!"))
        return {token: "]!", remaining: t.substring(2)};
    else if(t.startsWith("]!,"))
        return {token: "]!,", remaining: t.substring(3)};
    else if(t.startsWith('],'))
        return {token: "],", remaining: t.substring(2)};
    else if(t.charAt(0) === '[')
        return {token: "[", remaining: t.substring(1)};
    else if(t.charAt(0) === ']')
        return {token: "]", remaining: t.substring(1)};
    else if(t.startsWith("p["))
        return {token: "p[", remaining: t.substring(2)};
    /*else if(t.startsWith("w_")){
        for(let i=0; i < t.length; i++){
            if(t.charAt(i) === "[")
                return {token: t.substring(0, i), remaining: t.substring(i+1)};
        }
        throw new Error("] not found");
    }
    */
   else{
        for(let i=0; i < t.length; i++){
            if(["[", "]"].includes(t.charAt(i))){
                const token = t.substring(0, i);
                for(const plug of plugins){
                    if(token.endsWith("|" + plug)){
                        const size = (plug).length;
                        return {token: t.substring(0, i-size), remaining: t.substring(i-size)};
                    }
                }
                if(plugins.includes(token)){
                    return {token: "*"+token, remaining: t.substring(i)};
                }
                else{
                    return {token, remaining: t.substring(i)};
                }
            }
            //if(t.substring(i).startsWith("|w_"))
            //    return {token: t.substring(0, i), remaining: t.substring(i+1)};
            if(t.substring(i).startsWith("|p["))
                return {token: t.substring(0, i), remaining: t.substring(i+1)};
        }
        return {token: t, remaining: ""};
        //throw new Error("| or [ or ] not found");
    }
}

export type Parsed = {t: string, c: (Parsed|string)[]};

export function parse(t: string, plugins: string[]){
    let remaining = t;
    
    const pending: (Parsed|string)[] = [];
    for(;;){
        const token = nextToken(remaining, plugins);
        if(token === null) break;
        remaining = token.remaining;
        if(!["]!", "]!,", "],", "[", "]", "p["].includes(token.token) && !token.token.startsWith("*")){
            let t = token.token;
            if(t.startsWith('|'))
                t = t.substring(1);
            if(t.charAt(t.length - 1) === "|")
                t = t.substring(0, t.length-1);
            pending.push(t);
        }else if(token.token === "p["){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === '['){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token.startsWith("*")){
            const aux = parse(remaining, plugins);
            pending.push({t: token.token, c: aux.parsed});
            remaining = aux.remaining;
        }else if(token.token === "]!" ||token.token === "]!," || token.token === "]," || token.token === "]" || remaining === ""){   
            if(token.token.includes("!"))
                pending.push("throws");
            break;
        }
    }
    return {remaining, parsed: pending};
}
