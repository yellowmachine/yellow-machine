import { DEBUG, dev, g, p, nr, run, compile, Data, sw } from '../index';
import watch, {DEBUG as wDebug} from '../watch';
import _sw from '../switch';
import repeat from '../repeat';

DEBUG.v = false;
wDebug.v = true;

test("plugin w with p", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);
    const c = g(["c1", "c2"]);

    const run = dev(path)({a, b, c}, {w: watch(["*.js"])});
    await run(`a|w[
                       p[
                         b,c`
    );
    expect(path).toEqual(["a", "b", "c1", "throws", "c2"]);
});

test("plugin p and compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const run = dev(path)({a, b});
    await run("a|p[a|b");

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and compact mode and ,", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const run = dev(path)({a, b});
    await run("a|p[a,b");

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and full compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "throw"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const run = dev(path)({a, b, c});
    await run("a|p[a|c,b]");
    expect(path).toEqual(["a1", "throw", "b"]);
});

test("plugin p and full compact mode v2", async ()=>{
    const path: string[] = [];
    const up = g(["up"]);
    const dql = g(["dql1", "dql!"]);
    const test = g(["test"]);
    const down = g(["down"]);

    const run = dev(path)({up, dql, test, down}, {w: watch(["*"])});
    await run(`up[
        w[ dql | test ]
        down`
    );

    expect(path).toEqual(["up", "dql1", "test", "dql!", "down"]);
});

test("plugin p and full compact mode with ?", async ()=>{
    const path: string[] = [];
    const up = g(["up"]);
    const dql = g(["dql 1", "dql!"]);
    const test = g(["test", "test!"]);
    const down = g(["down"]);

    const run = dev(path)({up, dql, test, down}, {w: watch(["*"])});
    await run(`up[
        w[ dql? | test ]
        down`
    );

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

    const run = dev(path)({a, b, c}, {sw: _sw(decide)});
    await run("a|sw[b,c]");
    expect(path).toEqual(["a", "b"]);
});

test("]?", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const run = dev(path)({a, b, c, x}, {});
    await run("a[b!|c]?x");

    expect(path).toEqual(["a", "throws"]);
});

test("]? nested []", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const run = dev(path)({a, b, c, x}, {});
    await run("a[[b!]|c]?x");

    expect(path).toEqual(["a", "throws", "x"]);
});

test("]? without !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const run = dev(path)({a, b, c, x}, {});
    const response = await run("a[b|c]x");

    expect(response).toBe("x");
    expect(path).toEqual(["a", "throws", "x"]);
});

test("plugin parallel", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const run = dev(path)({a, b}, {pall: p("all")});
    await run("a|pall[a,b");

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin repeat", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const run = dev(path)({a, b}, {r2: repeat(2), buffer: nr({mode: "buffer"})});

    await run("r2[buffer[a|b");

    expect(path).toEqual(["a1", "b1", "a2", "b2"]);
});

test("plugin repeat default not reentrant", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const run = dev(path)({a, b}, {r2: repeat(2)});

    await run("r2[^[a|b");

    expect(path).toEqual(["a1", "b1", "a2", "b2"]);
});

test("plugin repeat no buffer", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    const run = dev(path)({a, b}, {r2: repeat(3), buffer: nr({mode: "nobuffer"})});

    await run("r2[buffer[a|b");

    expect(path).toEqual(["a1", "b1"]);
});

test("? catched", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b!"]);
    const x = g(["x"]);

    const run = dev(path)({a, b, x});

    await run("a[b!|c]?x");

    expect(path).toEqual(["a1", "b!"]);
});

test("? catched continues", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b!"]);
    const x = g(["x"]);

    const run = dev(path)({a, b, x});

    await run("a[b]x");

    expect(path).toEqual(["a1", "b!", "x"]);
});

test("some processing", async ()=>{
    const path: string[] = [];
    const a = (t: Data) => t.data + 'a';
    const b = (t: Data) => t.data + 'b';

    const run = dev(path)({a, b});

    const response = await run("a|b", "x");

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

    const run = dev(path)({a, b, c}, {sw: _sw(decide)});
    await run("a|sw[b|c]");
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

    const run = dev(path)({a, b, c, x}, {sw: sw(decide)});
    await run("a|sw[b|c]|x");
    expect(path).toEqual(["a", "x"]);
});

test("ini[a|b]3!end", async ()=>{
    const path: string[] = [];

    const ini = g(["ini"]);
    const a = g(["a!"]);
    const b = g(["b"]);
    const end = g(["end"]);

    function decide(data: Data): number|boolean{
        if(data.data === 'a') return false;
        else return true;
    }

    const run = dev(path)({ini, a, b, end}, {sw: sw(decide)});
    await run("ini[a|b]3!end");
    expect(path).toEqual([ "ini", "a!", undefined, 'b', 'end']);
});

test("[ini|a[b!|c]?x]y", async ()=>{
    const path: string[] = [];

    const a = g(["a"]);
    const b = g(["b!"]);
    const c = g(["c"]);
    const x = g(["x"]);
    const y = g(["y"]);

    const run = dev(path)({a, b, c, x, y});
    await run("[a[b!|c]?x]y");
    expect(path).toEqual([ "a", "b!", "y"]);
});

test("plugin repeat compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2", "a3"]);
    const b = g(["b1", "b2", "a3"]);

    //const run = dev(path)({a, b}, {buffer: nr({mode: "buffer"})});

    await run("2[buffer[a|b", {namespace: {a, b}});

    expect(path).toEqual(["a1", "b1", "a2", "b2"]);
});