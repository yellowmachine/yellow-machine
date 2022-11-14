import { DEBUG, dev, g } from '../index';
import watch from '../watch';

DEBUG.v = true;

test("plugin w", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w(["b"])])();

    expect(path).toEqual(["a"]);
});

test("plugin p", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p(["a", "b"])])();

    expect(path).toEqual(["a1", "a2", "b"]);
});

test("plugin w and !", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b!"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w(["b"])])();

    expect(path).toEqual(["a"]);
});

test("plugin p and compact mode", async ()=>{
    const path: string[] = [];
    const a = g(["a1", "a2"]);
    const b = g(["b"]);

    const {serial, p} = dev(path)({a, b});
    await serial(["a", p("a|b")])();

    expect(path).toEqual(["a1", "a2", "b"]);
});