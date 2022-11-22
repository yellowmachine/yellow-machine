type Token = {
    test: RegExp,
    opts?: RegExp[]
};

type TokenValue = {
    name: string,
    value: string,
    opts: (string|null)[]
}


const COMMA = 'COMMA';
const PIPE = 'PIPE';
const THROW = "THROW";
const CATCH = "CATCH";
const BEGIN_ARRAY = "BEGIN_ARRAY";
const END_ARRAY = "END_ARRAY";
const NAME = "NAME";

export function *nextToken(r: string){

    const tokens: Record<string, Token> = {
        COMMA: {
            test: RegExp("^,")
        },
        PIPE: {
            test: RegExp("^\\|")
        },
        THROW: {
            test: RegExp("^(]\\d*!)"),
            opts: [RegExp("^](\\d*)!")]
        },
        CATCH: {
            test: RegExp("(]\\d*\\?)"),
            opts: [RegExp("](\\d*)\\?")]
        },
        BEGIN_ARRAY: {
            test: RegExp("^[\\^]?\\[")
        },
        NAME: {
            test: RegExp("^(\\^?[a-zA-Z][a-zA-Z\\d]*\\??)")
        },
        END_ARRAY: {
            test: RegExp("^]")
        }
    };

    do{
        const token: TokenValue =  {
            name: "",
            value: "",
            opts: []
        };
        
        let found = false;

        for(const k of Object.keys(tokens)){
            token.name = k;
            const tk = tokens[k]; 
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
        name: ";",
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
            if(token.name === ";" || token.name === END_ARRAY){
                sub.c.push(parseAtom(name));
                ret.c.push(sub);
                if(ret.c.length > 1){
                    ret.plugin = 'p';
                }else{
                    ret.plugin = 's';
                }        
                return ret;
            }else if(token.name === COMMA){
                sub.c.push(parseAtom(name)); 
                ret.c.push(sub);
                sub = {type: "array", plugin: 's', c: []};
            }else if(token.name === PIPE){
                sub.c.push(parseAtom(name));
            }else if(token.name === BEGIN_ARRAY){
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
            }else if(token.name === CATCH){
                const m = parseInt(token.opts[0] || '1');
                ret.retryCatch = m;
                return ret;
            }else if(token.name === THROW){
                const m = parseInt(token.opts[0] || '1');
                ret.retryThrow = m;
                return ret;
            }else if(token.name === NAME){
                name = token.value;
            }
        }
    }
    return parseArray();
};

