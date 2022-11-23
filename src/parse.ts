type Token = {
    id: number,
    name: string,
    value: string,
    opts: (string|null)[]
}

export enum TOKEN {
    PLUGIN,
    NAME,
    THROW,
    CATCH,
    BEGIN_ARRAY,
    END_ARRAY,
    NR,
    COMMA,
    PIPE,
    END
  }

export function matchToken(exp: RegExp|undefined, t: string){
    const token: {value: string, opts: (null|string)[]} =  {
        value: ";",
        opts: []
    };

    if(exp === undefined) return null;
    
    if(exp.test(t)){
        const match = t.match(exp);
        if(match){
            token.value = match[0];
            token.opts = match.slice(1);
        }
        return token;
    }
    return null;
}

export const tokens: {[key in keyof typeof TOKEN]?: RegExp} = {
    [TOKEN.PLUGIN]: RegExp("^([a-zA-Z][a-zA-Z\\d]*)?'"),
    [TOKEN.NAME]: RegExp("^([a-zA-Z][a-zA-Z\\d]*)(\\??)"),
    [TOKEN.THROW]: RegExp("^](\\d*)!"),
    [TOKEN.CATCH]: RegExp("](\\d*)\\?"),
    [TOKEN.BEGIN_ARRAY]: RegExp("^\\["),
    [TOKEN.NR]: RegExp("^\\^"),
    [TOKEN.COMMA]: RegExp("^,"),
    [TOKEN.PIPE]: RegExp("^\\|"),
    [TOKEN.END_ARRAY]: RegExp("^]")
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

        for(const k in Object.keys(TOKEN)){
            token.id = parseInt(k);
            token.name = TOKEN[k];
            const tk = tokens[k as unknown as TOKEN]; 
            if(!tk) throw new Error("Error: token undefined");
            const m = matchToken(tk, r);
            if(m){
                found = true;
                token.value = m.value;
                token.opts = m.opts;
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
    plugins: string[],
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
    plugins: string[]
};

type C = ParsedAtom|ParsedExpression;
type ParsedExpression = C[];

const removeWhite = (t: string) => t.replace(/\s/g,'');

export const parse = (t: string) => {
    
    const g = nextToken(removeWhite(t));

    function parseAtom(t: string): ParsedAtom{
        let catched = false;
        if(t.endsWith('?')){
            t = t.substring(0, t.length-1);
            catched = true;
        }
        return {type: "atom", name: t, catched, plugins: []};       
    }

    function parseArray(): ParsedArray{

        const ret: ParsedArray = {type: "array", c: [], plugins: ['s']};
        let sub: ParsedArray = {type: "array", c: [], plugins: ['s']};
        let name = "";
        let plugins: string[] = [];

        for(;;){
            const token = g.next().value; 
            if(token.id === TOKEN.END || token.id === TOKEN.END_ARRAY){
                if(name !== ""){
                    const atom = parseAtom(name);
                    atom.plugins = [...plugins];
                    sub.c.push(atom);
                }   
                ret.c.push(sub); 
                return ret;
            }else if(token.id === TOKEN.NR){
                plugins.push("nr");
            }else if(token.id === TOKEN.COMMA){
                const atom = parseAtom(name); 
                atom.plugins = [...plugins];
                plugins = [];
                sub.c.push(atom);
                ret.c.push(sub);
                sub = {type: "array", c: [], plugins: ['s']};
            }else if(token.id === TOKEN.PIPE){
                const atom = parseAtom(name); 
                atom.plugins = [...plugins];
                plugins = [];
                sub.c.push(atom);
            }else if(token.id === TOKEN.BEGIN_ARRAY){
                const arr = parseArray();
                //arr.plugins = plugins.length > 0 ? [...plugins]:(arr.c.length > 1? ['p']: ['s']);
                arr.plugins = [...plugins];
                plugins = [];
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
            }else if(token.id === TOKEN.PLUGIN){
                let pluginName = token.value.substring(0, token.value.length-1);
                pluginName = pluginName === ""? 'p':pluginName;
                plugins.push(pluginName);
            }
            else{
                throw new Error("Parse error:" + JSON.stringify(token));
            }
        }
    }
    return parseArray();
};

