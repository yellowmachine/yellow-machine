import { DEBUG } from '../index';
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
    expect(p).toEqual({c: 
        [
            {c: [
                {name: "a", type: "atom"},
                {name: "b", type: "atom"}
            
                ], 
            type: "array"}
        ], type: "array"
    });
});

/*
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

test("parse base", ()=>{
    const {c} = parse("a", plugins);
    expect(c).toEqual(["a"]);
});

test("parse base ,", ()=>{
    const {c} = parse("a,b", plugins);
    expect(c).toEqual([{t: ",", c: ["a", "b"]}]);
});

test("parse base |", ()=>{
    const {c} = parse("a|b", plugins);
    expect(c).toEqual(["a|b"]);
});

test("parse base mixin | ,", ()=>{
    const {c} = parse("a|b,c", plugins);
    expect(c).toEqual([{t: ",", c: ["a|b", "c"]}]);
});

test("parse base ^", ()=>{
    const {c} = parse("^a", plugins);
    expect(c).toEqual([{ t:'f', nr: true, c: ["a"]}]);
});

test("parse base ^ with ,", ()=>{
    const {c} = parse("^a,b", plugins);
    expect(c).toEqual([{t: ",", c: [{t: "f", nr: true, c: ["a"]}, "b"]}]);
});

test("parse base ^ with |", ()=>{
    const {c} = parse("^a|b", plugins);
    expect(c).toEqual([{t: "f", nr: true, c: ["a|b"]}]);
});

test("parse base ^ with | ,", ()=>{
    const {c} = parse("^a|b,c", plugins);
    expect(c).toEqual([{t: ",", c: [{t: "f", nr: true, c: ["a|b"]}, "c"]}]);
});

test("parse plugin base", ()=>{
    const {c} = parse("p[a", plugins);
    expect(c).toEqual([{t: "[", plug: "p", c: ["a"]}]);
});

test("parse plugin and |", ()=>{
    const {c} = parse("p[a|b", plugins);
    expect(c).toEqual([{t: "[", plug: "p", c: ["a|b"]}]);
});

test("parse retry 3!", ()=>{
    const {c} = parse("[a|b]3!", plugins);
    expect(c).toEqual([{t: "[", plug: "|", c: [{t: "f", retry: 3, c: ["a|b"]}]}]);
});

test("parse [,]", ()=>{
    const {c} = parse("[a,b]", plugins);
    expect(c).toEqual([{t: "[", plug: ",", c: [{t: ",", c: ['a', 'b']}]}]);
});
*/