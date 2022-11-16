import { DEBUG } from '../index';
import { parse, nextToken } from '../parse';

DEBUG.v = false;

const plugins = ['nr', 'p'];

test("next token empty string", ()=>{
    expect(nextToken("", plugins)).toBe(null);
});

test("next token basic pipeline", ()=>{
    expect(nextToken("a|b,c[", plugins)).toEqual({remaining: "[", token: "a|b,c"});
});

test("next token basic pipeline with ^", ()=>{
    expect(nextToken("^a|b,c[", plugins)).toEqual({remaining: "[", token: "^a|b,c"});
});

test("next token basic pipeline with ^ and ^", ()=>{
    expect(nextToken("^a|b,^c[", plugins)).toEqual({remaining: "[", token: "^a|b,^c"});
});

test("next token basic pipeline with p", ()=>{
    expect(nextToken("a|b|p[", plugins)).toEqual({remaining: "p[", token: "a|b|"});
});

test("next token basic pipeline with ^ v2", ()=>{
    expect(nextToken("a|b|p^[", plugins)).toEqual({remaining: "p^[", token: "a|b|"});
});

test("next token basic pipeline with ^ v3", ()=>{
    expect(nextToken("p^[", plugins)).toEqual({remaining: "^[", token: "*p"});
});

test("next token basic pipeline with ^ v2", ()=>{
    expect(nextToken("^[a", plugins)).toEqual({remaining: "a", token: "^["});
});

test("parse empty", ()=>{
    const {remaining, parsed} = parse("", plugins);
    expect(parsed).toEqual([]);
    expect(remaining).toBe("");
});

test("parse most simple", ()=>{
    const {remaining, parsed} = parse("a", plugins);
    expect(parsed).toEqual(['a']);
    expect(remaining).toBe("");
});

test("parse most simple with ,", ()=>{
    const {remaining, parsed} = parse("a,b", plugins);
    expect(parsed).toEqual([{t: "[", c: ["a"]}, {t: "[", c: ["b"]}]);
    expect(remaining).toBe("");
});

test("parse most simple with |", ()=>{
    const {remaining, parsed} = parse("a|b|c", plugins);
    expect(parsed).toEqual(["a|b|c"]);
    expect(remaining).toBe("");
});

test("parse most simple with , |", ()=>{
    const {remaining, parsed} = parse("a,x|b|c", plugins);
    expect(parsed).toEqual([{t: "[", c: ["a"]}, {t: "[", c: ["x|b|c"]}]);
    expect(remaining).toBe("");
});

test("parse most simple with []", ()=>{
    const {remaining, parsed} = parse("a|[b]|c", plugins);
    expect(parsed).toEqual(["a", {t: "[", c: ["b"]}, "c"]);
    expect(remaining).toBe("");
});

test("parse most simple with [] without |[...]|", ()=>{
    const {remaining, parsed} = parse("a[b]c", plugins);
    expect(parsed).toEqual(["a", {t: "[", c: ["b"]}, "c"]);
    expect(remaining).toBe("");
});

test("parse most simple without ending", ()=>{
    const {remaining, parsed} = parse("a[b[c", plugins);
    expect(parsed).toEqual(["a", {t: "[", c: ["b", {t: "[", c: ["c"]}]}]);
    expect(remaining).toBe("");
});

test("parse most simple with p[]", ()=>{
    const {remaining, parsed} = parse("a|p[b]", plugins);

    expect(parsed).toEqual(["a", {t: "*p", c: ["b"]}]);
    expect(remaining).toBe("");
});

test("parse most simple with q[] q is not plugin", ()=>{
    const {remaining, parsed} = parse("a|q[b]", plugins);

    expect(parsed).toEqual(["a|q", {t: "[", c: ['b']}]);
    expect(remaining).toBe("");
});

test("parse most simple with q[] q is not plugin", ()=>{
    const {remaining, parsed} = parse("a|p^[b]", plugins);

    expect(parsed).toEqual(["a", {t: "*p", c: [{t: "^[", c: ["b"]}]}]);
    expect(remaining).toBe("");
});

test("parse ]?", ()=>{
    const {remaining, parsed} = parse("a[b!|c]?x", plugins);
    expect(parsed).toEqual(["a",{t: "[", c: ["b!|c", "?"]}, "x"]);
    expect(remaining).toBe("");
});
