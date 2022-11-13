import { DEBUG, context as C, dev, g } from '../index';
import watch from '../watch';

DEBUG.v = false;

test("", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b"]);
    
    const pw = watch(["*.js"]);

    const {serial, plug} = dev(path)({a, b});

    await serial(["a", plug(pw)([])]);
});