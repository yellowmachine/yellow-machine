import { DEBUG, context as C, dev, g } from '../index';
import { parse } from '../parse';

DEBUG.v = false;

/*
test("parse most simple", ()=>{
    const {remaining, parsed} = parse("a|b|c");
    expect(parsed).toEqual(["a", "b", "c"]);
    expect(remaining).toBe("");
});

test("parse most simple with []", ()=>{
    const {remaining, parsed} = parse("a|[b]|c");
    expect(parsed).toEqual(["a", ["b"], "c"]);
    expect(remaining).toBe("");
});

test("parse most simple with |[]|", ()=>{
    const {remaining, parsed} = parse("a[b]c");
    expect(parsed).toEqual(["a", ["b"], "c"]);
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

test("build with exception", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["throw"]);
    const c = g(["c"]);

    const { serial } = dev(path)({"a": a, "b": b, "c": c});
    await serial(["a|b!|c"]);
    expect(path).toEqual(["a", "throws"]);
});

test("build with exception catched v0", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["throw"]);
    const c = g(["c"]);

    const { serial } = dev(path)({"a": a, "b": b, "c": c});
    await serial(["a[b]c"]);
    expect(path).toEqual(["a", "throws", "c"]);
});

test("build with exception catched", async ()=>{
    const path: string[] = [];
    
    const a = g(["a"]);
    const b = g(["throw"]);
    const c = g(["c"]);

    const { serial } = dev(path)({"a": a, "b": b, "c": c});
    await serial(["a[b!]c"]);
    expect(path).toEqual(["a", "throws"]);
});

test("parallel with compact mode", async ()=>{
    const path: string[] = [];
    
    const a = g(["a", "a2"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const { parallel } = dev(path)({"a": a, "b": b, "c": c});
    await parallel(["a", "a|b|c"]);
    expect(path).toEqual(["a", "a2", "b", "c"]);
});
*/

test("parse simple", ()=>{
    const {parsed} = parse("a|b|c");
    expect(parsed).toEqual(["a|b|c"]);
});

test("parse w", ()=>{
    const {parsed} = parse("a|w_1[b]|c");
    expect(parsed).toEqual(["a", {t: "w_1", c: ["b"]}, "c"]);
});

test("parse p", ()=>{
    const {parsed} = parse("a|p[b,c]|d");
    console.log(JSON.stringify(parsed));
    expect(parsed).toEqual(["a", {t: "p[", c: ["b,c"]}, "d"]);
});