import watch, {DEBUG as wDebug} from '../watch';
import { DEBUG, g, compile } from '../index';

DEBUG.v = false;
wDebug.v = false;

test("namespace error", async ()=> {
    
    const a = g('a');
    const e = g('e');

    const t = "a|w'[e]";
    const cmp = () => compile(t, {
        namespace: {a, e}
    });

    expect(cmp).toThrow(/^Key Error: plugin namespace error: w.*/);
});