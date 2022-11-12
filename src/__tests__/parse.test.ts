import { DEBUG, context as C, dev, g } from '../index';
import { parse, build } from '../parse';

DEBUG.v = false;

test("parse most simple", ()=>{
    const {remaining, parsed} = parse("a|b|c");
    expect(parsed).toEqual(["a", "b", "c"]);
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
        expect(true).toBe(false);
    }

});