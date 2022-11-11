import { context as C } from '../index';

test("quiting w with keypress q", async ()=> {
    const path: string[] = [];
    const a = async() => path.push('a');
    const end = async() => path.push('end');
    const b = async() => {
        path.push('b');
        process.stdin.emit("keypress", 'q');
    };
    
    const {serial, w} = C();
    await serial([a, [w(["*.hey"], [b]), end]]);
    expect(path).toEqual(['a', 'b', 'end']);
});