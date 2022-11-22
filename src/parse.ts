type B = (string|B|P)[]|undefined;
type P = {p?: B, w?: {files: string[], pipe: B}};

const go = (t: string, token: string) => t.substring(token.length);

const isBeginingArray = (r: string) => /^[\^]?\[/.test(r);
const matchBeginingArray = (r: string) => {
    const match = r.match(/^[\^]?\[/);
    return match ? match[0]:"[";
};

const isName = (r: string) => /^[\^]?\w[\w\d]*[?]?/.test(r);
const matchName = (r: string) => {
    const match = r.match(/^[\^]?\w[\w\d]*[?]?/);
    return match ? match[0]:"_";
};

const isRetryThrow = (r: string) => /^\]\d*!/.test(r);
const matchRetryThrow = (r: string) => {
    const match = r.match(/^(\]\d*!)/);
    return match ? match[1]:"]1!";
};

const isRetryCatch = (r: string) => /^\]\d*\?/.test(r);
const matchRetryCatch = (r: string) => {
    const match = r.match(/^(\]\d*\?)/);
    return match ? match[1]:"]1?";
};
const matchRetryCatchNumber = (r: string) => {
    const match = r.match(/^\]\(d*)\?/);
    return match ? parseInt(match[1]): 1;
};
const matchRetryThrowNumber = (r: string) => {
    const match = r.match(/^\]\(d*)!/);
    return match ? parseInt(match[1]): 1;
};

export function *nextToken(r: string){
    do{
        if(r.charAt(0) === ','){
            r = go(r, ',');
            yield ',';
        }else if(r.charAt(0) === '|'){
            r = go(r, '|');
            yield '|';
        }else if(isRetryThrow(r)){
            const token = matchRetryThrow(r);
            r = go(r, token);
            yield token;
        }else if(isRetryCatch(r)){
            const token = matchRetryCatch(r);
            r = go(r, token);
            yield token;
        }else if(isBeginingArray(r)){
            const token = matchBeginingArray(r);
            r = go(r, token);
            yield token;
        }else if(isName(r)){
            const token = matchName(r);
            r = go(r, token);
            yield token;
        }else if(r.charAt(0) === ']'){
            r = go(r, ']');
            yield ']';
        }else if(r.length > 0){
            throw new Error("Syntax error at: " + r + ". No valid token found.");
        }
    }while(r.length > 0);
    return ";";
}

export type ParsedAtom = {
    type: "atom",
    name: string, 
    plugin?: string,
    retry?: number,
    catched: boolean,
    nr?: boolean, 
    repeat?: number
};

export type ParsedArray = {
    type: "array",
    c: (ParsedAtom|ParsedArray)[],
    retryCatch?: number,
    retryThrow?: number,
    //retry?: number;
    nr?: number,
    repeat?: number,
    plugin: string
};

type C = ParsedAtom|ParsedExpression;
type ParsedExpression = C[];

const removeWhite = (t: string) => t.replace(/\s/g,'');

export const parse = (t: string, plugins: string[]) => {
    
    const g = nextToken(removeWhite(t));

    function parseAtom(t: string): ParsedAtom{
        let catched = false;
        if(t.endsWith('?')){
            t = t.substring(0, t.length-1);
            catched = true;
        }
        if(t.startsWith('^'))
            return {type: "atom", nr: true, name: t.substring(1), catched};
        else
            return {type: "atom", name: t, catched};
    }

    function parseArray(): ParsedArray{

        const ret: ParsedArray = {type: "array", plugin: 'p', c: []};
        let sub: ParsedArray = {type: "array", plugin: 's', c: []};
        let name = "";

        for(;;){
            const token = g.next().value; 
            if(token === ";" || token === ']'){
                sub.c.push(parseAtom(name));
                ret.c.push(sub);
                if(ret.c.length > 1){
                    ret.plugin = 'p';
                }else{
                    ret.plugin = 's';
                }        
                return ret;
            }else if(token === ','){
                sub.c.push(parseAtom(name)); 
                ret.c.push(sub);
                sub = {type: "array", plugin: 's', c: []};
            }else if(token === '|'){
                sub.c.push(parseAtom(name));
            }else if(isBeginingArray(token)){
                const arr = parseArray();
                if(plugins.includes(name)){
                    arr.plugin = name;
                }else{
                    if(arr.c.length > 1){
                        arr.plugin = 'p';
                    }else{
                        arr.plugin = 's';
                    }
                }
                sub.c.push(arr);
            }else if(isRetryCatch(token)){
                const m = matchRetryCatchNumber(token);
                ret.retryCatch = m;
                return ret;
            }else if(isRetryThrow(token)){
                const m = matchRetryThrowNumber(token);
                ret.retryThrow = m;
                return ret;
            }else if(isName(token)){
                name = matchName(token);
            }
        }
    }
    return parseArray();
};

