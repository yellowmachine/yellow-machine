import { context as C, DEBUG } from '../index';
import watch, {DEBUG as wDebug} from '../watch';

DEBUG.v = false;
wDebug.v = false;

test("quiting w with keypress q", async ()=> {
    const path: string[] = [];
    const a = async() => path.push('a');
    const end = async() => path.push('end');
    const b = async() => {
        path.push('b');
        process.stdin.emit("keypress", 'q');
    };
    
    const {serial, w} = C({}, {w: watch(["*.js"])});
    await serial([a, [w([b]), end]])();
    expect(path).toEqual(['a', 'b', 'end']);
});

test("quiting w with keypress q compact mode", async ()=> {
    const path: string[] = [];
    const a = async() => path.push('a');
    const end = async() => path.push('end');
    const b = async() => {
        path.push('b');
        process.stdin.emit("keypress", 'q');
    };
    
    const {serial} = C({a, b, end}, {w: watch(["*.js"])});
    await serial("a|w[b]end")(); 
    expect(path).toEqual(['a', 'b', 'end']);
});