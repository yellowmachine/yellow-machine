import { DEBUG, dev, g, i } from '../index';
import watch, {DEBUG as wDebug} from '../watch';

DEBUG.v = true;
wDebug.v = true;

test("plugin w a not found", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial, w} = dev(path)({b}, {w: watch(["*.js"])});
    
    await expect(async () =>
        await serial(["a", w(["b"])])(i())).rejects.toThrow('Key Error: namespace error: a'
    );
});

test("plugin w not found", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const {serial} = dev(path)({a, b}, {});
    
    await expect(async () =>
        await serial(["a|w[b"])(i())).rejects.toThrow('Key Error: namespace error: w'
    );
});