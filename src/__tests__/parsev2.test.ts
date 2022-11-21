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

test("next token basic pipeline with ^ v4", ()=>{
    expect(nextToken("^[a", plugins)).toEqual({remaining: "a", token: "^["});
});

test("next token with |^", ()=>{
    expect(nextToken("|^b", plugins)).toEqual({remaining: "", token: "|^b"});
});

test("next token with ^b", ()=>{
    expect(nextToken("^b", plugins)).toEqual({remaining: "", token: "^b"});
});

test("parse empty", ()=>{
    const {c} = parse("", plugins);
    expect(c).toEqual([]);

});