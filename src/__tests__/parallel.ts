import { DEBUG, context as C } from '../index';

DEBUG.v = false;

function setup(){

    const path: string[] = [];

    async function f_throws_1(){
        path.push('throw 1');
        throw new Error('throw 1');        
    }

    async function f_throws_2(){
        path.push('throw 2');
        throw new Error('throw 2');
    }

    async function f1(){
        path.push('1');
    }

    async function f2(){
        path.push('2');
    }

    async function f3(){
        path.push('3');
    }

    async function ini(){
        path.push('ini');
    }

    async function end(){
        path.push('end');
    }

    return { f_throws_1, f_throws_2, f1, f2, f3, ini, end, path };
}


test('parallel ok', async () => {
    const {f1, f2, f3, path} = setup();
    await C().parallel([f1, f2, f3]);
    expect(path.length).toBe(3);
    expect(path).toContain('1');
    expect(path).toContain('2');
    expect(path).toContain('3');
});

test('parallel nested ok', async () => {
    const {f1, f2, f3, ini, end, path} = setup();
    const {serial, p} = C();
    async function m(){
        await serial([ini, p([f1, f2, f3]), end]);
    }
    await m();
    const subpath = path.slice(1, -1);
    expect(path[0]).toBe('ini');
    expect(subpath.length).toBe(3);
    expect(subpath).toContain('1');
    expect(subpath).toContain('2');
    expect(subpath).toContain('3');
    expect(path.at(-1)).toBe('end');
});

test('parallel nested w ok', async () => {
    const {f_throws_1, f_throws_2, ini, end, path} = setup();
    const {serial, p, w} = C({f_throws_1, f_throws_2});
    async function m(){
        await serial([ini, 
                    p([w(["*.js"], 
                            ["f_throws_1", 'throws']), 
                       w(["*.c"], 
                            ["f_throws_2", 'throws'])]), 
                    end]);
    }
    await m();
    const subpath = path.slice(1, -1);
    expect(path[0]).toBe('ini');
    expect(subpath.length).toBe(2);
    expect(subpath).toContain('throw 1');
    expect(subpath).toContain('throw 2');
    expect(path.at(-1)).toBe('end');
});

test('parallel throws', async () => {
    const path: string[] = [];

    const {serial, p} = C();

    async function ini(){
        path.push("ini");
    }

    async function end(){
        path.push("end");
    }

    async function f_throw(){
        path.push("f_throw");
        throw new Error("my");
    }
    async function m(){
        await serial([ini, p([f_throw]), end]);
    }
    await m();
    expect(path).toEqual(["ini", "f_throw"]);
});