import { DEBUG, compile, g } from '../index';

DEBUG.v = false;

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
});


test("run a,b,c!", async ()=>{
    const a = g('a');
    const b = g('b');
    const c = g('c!');

    const t = "a,b,c";
    const cmp = compile(t, {
        namespace: {a, b, c}
    });

    await expect(cmp("")).rejects.toThrow(/^a?b?c!/);
});