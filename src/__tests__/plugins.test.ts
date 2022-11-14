import { DEBUG, context as C, dev, g, setPlugin } from '../index';
import watch from '../watch';

DEBUG.v = false;

test("", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);

    const {serial, w} = dev(path)({a, b}, {w: watch(["*.js"])});
    await serial(["a", w(["b"])]);

});