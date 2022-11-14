import { DEBUG, dev, g } from '../index';
import watch from '../watch';

DEBUG.v = true;

test("", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w(["b"])])();

    expect(path).toEqual(["a"]);
});