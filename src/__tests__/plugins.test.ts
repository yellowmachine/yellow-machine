import { DEBUG, dev, g, parallel, notReentrant, i, Data, sw } from '../index';
import watch, {DEBUG as wDebug} from '../watch';
import _sw from '../switch';
import repeat from '../repeat';

DEBUG.v = false;
wDebug.v = true;

test("plugin w", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w("b")])(i());

    expect(path).toEqual(["a", "b", "throws"]);
});

test("plugin p", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p(["a", "b"])])(i());

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin w with p", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);
    const c = g(["c1", "c2"]);

    const {serial} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    //await serial(["a|w[p[b,c"])(i());
    await serial(`a|w[
                       p[
                         b,c`
    )(i());
    expect(path).toEqual(["a", "b", "c1", "throws", "c2"]);
});

test("plugin w and !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b!"]);
    const c = g(["c"]);

    const {serial, w} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    await serial(["a", w("b"), "c"])(i());

    expect(path).toEqual(["a", "b!", "c"]);
});

test("plugin p and compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p("a|b")])(i());

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and compact mode and ,", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p("a,b")])(i());

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and compact mode and ,", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "throw"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {serial, p} = dev(path)({a, b, c});
    await serial(["a", p("a|c,b")])(i());

    expect(path).toEqual(["a1", "throw", "b"]);
});

test("plugin p and full compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "throw"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {serial} = dev(path)({a, b, c});
    await serial("a|p[a|c,b]")(i());
    expect(path).toEqual(["a1", "throw", "b"]);
});

test("plugin p and full compact mode v2", async ()=>{
    const path: string[] = [];
    const up = g(["up"]);
    const dql = g(["dql1", "dql!"]);
    const test = g(["test"]);
    const down = g(["down"]);

    const {serial} = dev(path)({up, dql, test, down}, {w: watch(["*"])});
    await serial(`up[
        w[ dql | test ]
        down`
    )(i());

    expect(path).toEqual(["up", "dql1", "test", "dql!", "down"]);
});

test("plugin p and full compact mode with ?", async ()=>{
    const path: string[] = [];
    const up = g(["up"]);
    const dql = g(["dql 1", "dql!"]);
    const test = g(["test", "test!"]);
    const down = g(["down"]);

    const {serial} = dev(path)({up, dql, test, down}, {w: watch(["*"])});
    await serial(`up[
        w[ dql? | test ]
        down`
    )(i());

    expect(path).toEqual(["up", "dql 1", "test", "dql!", "down"]);
});

test("plugin sw", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    function decide(data: Data): number{
        if(data.data === 'a') return 0;
        else return 1;
    }

    const {serial} = dev(path)({a, b, c}, {sw: _sw(decide)});
    await serial("a|sw[b,c]")(i());
    expect(path).toEqual(["a", "b"]);
});

test("]?", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    await serial("a[b!|c]?x")(i());

    expect(path).toEqual(["a", "throws"]);
});

test("]? nested []", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    await serial("a[[b!]|c]?x")(i());

    expect(path).toEqual(["a", "throws", "x"]);
});

test("]? without !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    const response = await serial("a[b|c]x")(i());

    expect(response).toBe("x");
    expect(path).toEqual(["a", "throws", "x"]);
});

test("plugin parallel", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, pall} = dev(path)({a, b}, {pall: parallel("all")});
    await serial(["a", pall(["a", "b"])])(i());

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin repeat", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const {serial} = dev(path)({a, b}, {r2: repeat(2), buffer: notReentrant({mode: "buffer"})});

    await serial("r2[buffer[a|b")(i());

    expect(path).toEqual(["a1", "b1", "a2", "b2"]);
});

test("plugin repeat default not reentrant", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const {serial} = dev(path)({a, b}, {r2: repeat(2)});

    await serial("r2[^[a|b")(i());

    expect(path).toEqual(["a1", "b1", "a2", "b2"]);
});

test("plugin repeat no buffer", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const {serial} = dev(path)({a, b}, {r2: repeat(3), buffer: notReentrant({mode: "nobuffer"})});

    await serial("r2[buffer[a|b")(i());

    expect(path).toEqual(["a1", "b1"]);
});

test("? catched", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b!"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, x});

    await serial("a[b!|c]?x")(i());

    expect(path).toEqual(["a1", "b!"]);
});

test("? catched continues", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b!"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, x});

    await serial("a[b]x")(i());

    expect(path).toEqual(["a1", "b!", "x"]);
});

test("some processing", async ()=>{
    const path: string[] = [];
    const a = (t: Data) => t.data + 'a';
    const b = (t: Data) => t.data + 'b';

    const {serial} = dev(path)({a, b});

    const response = await serial("a|b")(i("x"));

    expect(response).toBe('xab');
});

test("plugin sw boolean", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    function decide(data: Data): number|boolean{
        if(data.data === 'a') return true;
        else return false;
    }

    const {serial} = dev(path)({a, b, c}, {sw: _sw(decide)});
    await serial("a|sw[b|c]")(i());
    expect(path).toEqual(["a", "b", "c"]);
});

test("plugin sw boolean return false", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);
    const x = g(["x"]);

    function decide(data: Data): number|boolean{
        if(data.data === 'a') return false;
        else return true;
    }

    const {serial} = dev(path)({a, b, c, x}, {sw: sw(decide)});
    await serial("a|sw[b|c]|x")(i());
    expect(path).toEqual(["a", "x"]);
});