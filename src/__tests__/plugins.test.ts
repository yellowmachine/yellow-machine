import { DEBUG, dev, g } from '../index';
import watch, {DEBUG as wDebug} from '../watch';
import _sw from '../switch';
import { parse } from '../parse';

DEBUG.v = false;
wDebug.v = true;

test("plugin w", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w("b")])({data: "someinitial data", ctx: {quit: ()=>true}});

    expect(path).toEqual(["a", "b", "throws"]);
});

test("plugin p", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p(["a", "b"])])();

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin w with p", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);
    const c = g(["c1", "c2"]);

    const {serial} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    //await serial(["a|w[p[b,c"])();
    await serial([`a|w[
                       p[
                         b,c`]
    )();
    expect(path).toEqual(["a", "b", "c1", "throws", "c2"]);
});

test("plugin w and !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b!"]);
    const c = g(["c"]);

    const {serial, w} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    await serial(["a", w("b"), "c"])();

    expect(path).toEqual(["a", "b!", "c"]);
});

test("plugin p and compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p("a|b")])();

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and compact mode and ,", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p("a,b")])();

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin p and compact mode and ,", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "throw"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {serial, p} = dev(path)({a, b, c});
    await serial(["a", p("a|c,b")])();

    expect(path).toEqual(["a1", "throw", "b"]);
});

test("plugin p and full compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "throw"]);
    const b = g(["b"]);
    const c = g(["c"]);

    const {serial} = dev(path)({a, b, c});
    await serial("a|p[a|c,b]")();
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
    )();

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
    )();

    expect(path).toEqual(["up", "dql 1", "test", "dql!", undefined, "test!", "down"]);
});

test("plugin sw", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);
    const c = g(["c"]);

    function decide(data: any): number{
        if(data === 'a') return 0;
        else return 1;
    }

    const {serial} = dev(path)({a, b, c}, {sw: _sw(decide)});
    await serial("a|sw[b,c]")();

    expect(path).toEqual(["a", "b"]);
});

test("]?", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    await serial("a[b!|c]?x")();

    expect(path).toEqual(["a", "throws"]);
});

test("]? nested []", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    await serial("a[[b!]|c]?x")();

    expect(path).toEqual(["a", "throws"]);
});

test.only("]? without !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["throws"]);
    const c = g(["c"]);
    const x = g(["x"]);

    const {serial} = dev(path)({a, b, c, x}, {});
    const response = await serial("a[b|c]?x")();
    console.log(response);

    expect(path).toEqual(["a", "throws"]);
});
