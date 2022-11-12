type B = (string|B|P)[];
type P = {p: B};

export function parse(t: string): {remaining: string, parsed: B}{

    let parsed: B = [];
    let partial = "";
    let i = -1;
    for(;;){
        i = i + 1;
        const c = t.substring(i, i+1);
        const next = t.substring(i+1, i+2);
        if(c === 'p' && next === "["){
            parsed = [...partial.slice(0, -1).split("|"), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+2));
            parsed.push({p: _parsed});
            t = remaining;
            i = -1;
            partial = "";
        }
        else if( c === "["){
            parsed = [...partial.slice(0, -1).split("|"), ...parsed];
            const {remaining, parsed: _parsed} = parse(t.substring(i+1));
            parsed.push(_parsed);
            t = remaining;
            i = -1;
            partial = "";
        }else if(c === "]" || c === ""){
            parsed = [...parsed, ...partial.split("|"), ];
            break;
        }else{
            partial = partial + c;
        }
    }
    return {remaining: t.substring(2+partial.length), parsed};
}