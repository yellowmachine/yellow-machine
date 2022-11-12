import { DEBUG, context as C, dev, g } from '../index';
import { parse, build } from '../parse';

DEBUG.v = true;

test("parse most simple", ()=>{
    const {remaining, parsed} = parse("a|b|c");
    expect(parsed).toEqual(["a", "b", "c"]);
    expect(remaining).toBe("");
});

test("parse with p[]", ()=>{
    const {remaining, parsed} = parse("p[b|c]");
    expect(parsed).toEqual([{p: ["b", "c"]}]);
    expect(remaining).toBe("");
});

test("parse with []", ()=>{
    const {remaining, parsed} = parse("a|[b|c]|d");
    expect(parsed).toEqual(["a", ["b", "c"], "d"]);
    expect(remaining).toBe("");
});

test("parse with [] and p[]", ()=>{
    const {remaining, parsed} = parse("a|p[b|c]|d");
    expect(parsed).toEqual(["a", {p: ["b", "c"]}, "d"]);
    expect(remaining).toBe("");
});

test("build simple", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {serial, p, parallel} = dev(path)({"a": a, "b": b, "c": c});
    const {parsed} = parse("a|b|c");
    const x = build({serial: parsed}, {serial, parallel, p});
    if(x){
        await x();
        expect(path).toEqual(["a", "b", "c"]);
    }else{
        fail('it should not reach here');
    }

});

test("build simple from context", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {build} = dev(path)({"a": a, "b": b, "c": c});
    const x = build({serial: "a|b|c"});
    if(x){
        await x();
        expect(path).toEqual(["a", "b", "c"]);
    }else{
        fail('it should not reach here');
    }
});

test("build simple from context with inner parse and implicit parse", async ()=>{
    const path: string[] = [];
    
    const a = g(["a", "a2"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const { serial } = dev(path)({"a": a, "b": b, "c": c});
    await serial(["a", "a|b|c"]);
    expect(path).toEqual(["a", "a2", "b", "c"]);
});

test("build with p", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const { serial } = dev(path)({"a": a, "b": b, "c": c});
    await serial(["a", "p[b|c]"]);
    expect(path).toEqual(["a", "b", "c"]);
});
