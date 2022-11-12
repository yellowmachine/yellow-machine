import { parse } from '../parse';

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

test("parse with []", ()=>{
    const {remaining, parsed} = parse("a|p[b|c]|d");
    expect(parsed).toEqual(["a", {p: ["b", "c"]}, "d"]);
    expect(remaining).toBe("");
});
