import { DEBUG, compile, g } from '../index';
import { parse, nextToken } from '../parse';

DEBUG.v = false;

const plugins = ['nr', 'p'];

const consume = (t: string) => {
    return [...nextToken(t)];
};

test("next token empty string", ()=>{
    const t = "";
    const tokens = consume(t);
    expect(tokens).toEqual([]);
});

test("next token", ()=>{
    const t = "a,^b|c[e3";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", ",", "^b", "|", "c", "[", "e3"]);
});

test("next token ^[", ()=>{
    const t = "c^[e";
    const tokens = consume(t);
    expect(tokens).toEqual(["c", "^[", "e"]);
});

test("next token []", ()=>{
    const t = "a[b]";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", "[", "b", "]"]);
});

test("next token a|b", ()=>{
    const t = "a|b";
    const tokens = consume(t);
    expect(tokens).toEqual(["a", "|", "b"]);
});

test("parse", ()=>{
    const t = "a|b";
    const p = parse(t, plugins);
    expect(p).toEqual(
    {
        plugin: 's',
        c: 
        [
            {
                plugin: 's',
                c: [
                {name: "a", type: "atom"},
                {name: "b", type: "atom"}
            
                ], 
                type: "array"
            }
        ], 
        type: "array"
    }
    );
});

test("run a|b", async ()=>{
    const a = g('a');
    const b = g('b');

    const t = "a|b";
    const cmp = compile(t, {
        namespace: {a, b}
    });

    const result = await cmp("");
    expect(result).toBe('ab');
});

test("run a|b a!", async ()=>{
    
    const a = g('a!');
    const b = g('b');

    const t = "a|b";
    const cmp = compile(t, {
        namespace: {a, b}
    });

    await expect(cmp("")).rejects.toThrow("a!");

});

test("run a,c|b a!", async ()=>{
    const a = g('a!');
    const b = g('b');
    const c = g('c');

    const t = "a,c|b";
    const cmp = compile(t, {
        namespace: {a, b, c}
    });

    await expect(cmp("")).rejects.toThrow(/^(cb?)?a!/);
});


test("run a,b,c", async ()=>{
    const a = g('a');
    const b = g('b');
    const c = g('c');

    const t = "a,b,c";
    const cmp = compile(t, {
        namespace: {a, b, c}
    });

    const result = await cmp("");
    expect(result).toEqual(["a", "b", "c"]);
    //await expect(cmp("")).rejects.toThrow('c,b,a');
});


test("run a,b,c!", async ()=>{
    const a = g('a');
    const b = g('b');
    const c = g('c!');

    const t = "a,b,c";
    const cmp = compile(t, {
        namespace: {a, b, c}
    });

    await expect(cmp("")).rejects.toThrow(/a?b?c!/);
});