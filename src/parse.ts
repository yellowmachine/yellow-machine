type TokenExp = {
    test: RegExp,
    opts?: RegExp[]
};

type Token = {
    id: number,
    name: string,
    value: string,
    opts: (string|null)[]
}

export enum TOKEN {
    COMMA,
    PIPE,
    THROW,
    CATCH,
    BEGIN_ARRAY,
    END_ARRAY,
    NAME,
    PLUGIN,
    END
  }

export function matchToken(exp: TokenExp|undefined, t: string){
    const token: {value: string, opts: (null|string)[]} =  {
        value: ";",
        opts: []
    };

    if(exp === undefined) return null;
    
    if(exp.test.test(t)){
        const match = t.match(exp.test);
        if(match){
            token.value = match[0];
            token.opts = match.slice(1);
        }
        return token;
    }
    return null;
}

export const tokens: {[key in keyof typeof TOKEN]?: TokenExp} = {
    [TOKEN.COMMA]: {
        test: RegExp("^,")
    },
    [TOKEN.PIPE]: {
        test: RegExp("^\\|")
    },
    [TOKEN.THROW]: {
        test: RegExp("^(]\\d*!)"),
        opts: [RegExp("^](\\d*)!")]
    },
    [TOKEN.CATCH]: {
        test: RegExp("(]\\d*\\?)"),
        opts: [RegExp("](\\d*)\\?")]
    },
    [TOKEN.BEGIN_ARRAY]: {
        test: RegExp("^[\\^]?\\[")
    },
    [TOKEN.NAME]: {
        test: RegExp("^(\\^?)([a-zA-Z][a-zA-Z\\d]*')*([a-zA-Z][a-zA-Z\\d]*)(\\??)")
    },
    [TOKEN.PLUGIN]: {
        test: RegExp("^\\^?([a-zA-Z][a-zA-Z\\d]*')+\\??")
    },
    [TOKEN.END_ARRAY]: {
        test: RegExp("^]")
    }
};

export function *nextToken(r: string){

    do{
        const token: Token =  {
            id: TOKEN.END,
            name: TOKEN[TOKEN.END],
            value: ";",
            opts: []
        };
        
        let found = false;

        for(const k in tokens){
            token.id = parseInt(k);
            token.name = TOKEN[k];
            const x = k as unknown as TOKEN;
            const tk = tokens[x]; 
            if(!tk) throw new Error("no vale");
            if(tk.test.test(r)){
                let match = r.match(tk.test);
                if(match) token.value = match[0];
                if(tk.opts){
                    for(const sub of tk.opts){
                        match = r.match(sub);
                        if(match) token.opts.push(match[1]);
                        else token.opts.push(null);
                    }
                }
                found = true;
                break;
            }
        }
        if(found){
            r = r.substring(token.value.length);
            yield token;
        }
        else throw new Error("Syntax error");

    }while(r.length > 0);
    return {
        id: TOKEN.END,
        name: TOKEN[TOKEN.END],
        value: ";",
        opts: []
    };
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
            if(token.id === TOKEN.END || token.id === TOKEN.END_ARRAY){
                sub.c.push(parseAtom(name));
                ret.c.push(sub);
                if(ret.c.length > 1){
                    ret.plugin = 'p';
                }else{
                    ret.plugin = 's';
                }        
                return ret;
            }else if(token.id === TOKEN.COMMA){
                sub.c.push(parseAtom(name)); 
                ret.c.push(sub);
                sub = {type: "array", plugin: 's', c: []};
            }else if(token.id === TOKEN.PIPE){
                sub.c.push(parseAtom(name));
            }else if(token.id === TOKEN.BEGIN_ARRAY){
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
            }else if(token.id === TOKEN.CATCH){
                const m = parseInt(token.opts[0] || '1');
                ret.retryCatch = m;
                return ret;
            }else if(token.id === TOKEN.THROW){
                const m = parseInt(token.opts[0] || '1');
                ret.retryThrow = m;
                return ret;
            }else if(token.id === TOKEN.NAME){
                name = token.value;
            }else{
                throw new Error("Parse error:" + JSON.stringify(token));
            }
        }
    }
    return parseArray();
};

