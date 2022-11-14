import { DEBUG, dev, g } from '../index';
import watch from '../watch';

DEBUG.v = true;

test("plugin w", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w(["b"])])();

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
    await serial(["a|w[p[b,c]]"])();
    expect(path).toEqual(["a", "b", "c1", "throws", "c2"]);
});

test("plugin w and !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b!"]);
    const c = g(["c"]);

    const {serial, w} = dev(path)({a, b, c}, {w: watch(["*.js"])});
    await serial(["a", w("b"), "c"])();

    expect(path).toEqual(["a", "b!", undefined, "c"]);
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
