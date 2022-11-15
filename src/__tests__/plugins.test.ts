import { DEBUG, dev, g } from '../index';
import watch, {DEBUG as wDebug} from '../watch';
import {parse} from '../parse';

DEBUG.v = false;
wDebug.v = true;

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