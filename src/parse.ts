type Token = {
    id: number,
    name: string,
    value: string,
    opts: string[]
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
    const token: {value: string, opts: string[]} =  {
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
    [TOKEN.PLUGIN]: RegExp("^([a-zA-Z\\d]+)?'"),
    [TOKEN.NAME]: RegExp("^([a-zA-Z][a-zA-Z\\d]*)(\\??)"),
    [TOKEN.THROW]: RegExp("^](\\d*)!"),
    [TOKEN.CATCH]: RegExp("^](\\d*)\\?"),
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
    repeat?: number
};

export type ParsedArray = {
    type: "array",
    c: (ParsedAtom|ParsedArray)[],
    retryCatch?: number,
    retryThrow?: number,
    repeat?: number,
    plugins: string[]
};

type C = ParsedAtom|ParsedExpression;
type ParsedExpression = C[];

const removeWhite = (t: string) => t.replace(/\s/g,'');

export const parse = (t: string) => {
    
    const g = nextToken(removeWhite(t));

    function parseAtom({name, question}: {name: string, question: string}): ParsedAtom{
        const catched = question === '?' ? true : false;
        return {type: "atom", name, catched, plugins: []};       
    }

    function parseArray(): ParsedArray{

        const ret: ParsedArray = {type: "array", c: [], plugins: ['s']};
        let sub: ParsedArray = {type: "array", c: [], plugins: ['s']};
        let plugins: string[] = [];

        for(;;){
            const token = g.next().value; 
            if( token.id === TOKEN.END || 
                token.id === TOKEN.END_ARRAY ||
                token.id === TOKEN.CATCH ||
                token.id === TOKEN.THROW   
            ){
                const m = parseInt(token.opts[0] || '1');
                if(token.id == TOKEN.CATCH) ret.retryCatch = m;
                if(token.id == TOKEN.THROW) ret.retryThrow = m;
                ret.c.push(sub); 
                return ret;
            }else if(token.id === TOKEN.NR){
                plugins.push("nr");
            }else if(token.id === TOKEN.COMMA){
                ret.c.push(sub);
                sub = {type: "array", c: [], plugins: ['s']};
            }else if(token.id === TOKEN.PIPE){
                //
            }else if(token.id === TOKEN.BEGIN_ARRAY){
                const arr = parseArray();
                arr.plugins = [...plugins];
                plugins = [];
                sub.c.push(arr);
            }else if(token.id === TOKEN.NAME){
                const atom = parseAtom({name: token.opts[0], question: token.opts[1]}); 
                atom.plugins = [...plugins];
                plugins = [];
                sub.c.push(atom);
            }else if(token.id === TOKEN.PLUGIN){
                let pluginName = token.value.substring(0, token.value.length-1);
                pluginName = pluginName === "" ? 'p':pluginName;
                plugins.push(pluginName);
            }
            else{
                throw new Error("Parse error:" + JSON.stringify(token));
            }
        }
    }
    return parseArray();
};

