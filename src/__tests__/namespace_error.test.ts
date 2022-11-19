import { DEBUG, dev, g, i } from '../index';
import watch, {DEBUG as wDebug} from '../watch';

DEBUG.v = true;
wDebug.v = true;

test("plugin w not found", async ()=>{
    const path: string[] = [];
    const a = g(["a"]);
    const b = g(["b", "throws"]);

    const run = dev(path)({a, b}, {});
    
    await expect(async () =>
        await run("a|w[b")).rejects.toThrow('Key Error: namespace error: w'
    );
});