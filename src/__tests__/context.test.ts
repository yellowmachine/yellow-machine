import { context as C, dev} from '../index';

test('basic context', async () => {
    const path: string[] = [];
    const a = async() => {
        path.push('a');
    };
  
    const p = C({a}).serial([a, "a"]);
    await p;
    expect(path).toEqual(["a", "a"]);
});

test('with generators', async ()=>{
    const path: string[] = [];
    function *a(){
        yield 'a';
        yield 'b';
    }
  
    const p = dev(path)({a: a()}).serial(["a", "a"]);
    await p;
    expect(path).toEqual(["a", "b"]);
});

test('watch with generators', async ()=>{
    const path: string[] = [];
    function *ab(){
        yield 'a';
        yield 'b';
    }

    function *x(){
        yield "1";
        yield "2";
        return "3";
    }
  
    const {serial, w} = dev(path)({ab: ab(), x: x()});
    const p = serial(["ab", w(["*"], ["x"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "1", "2", "3", "b"]);
});

test('watch with generators and exception', async ()=>{
    const path: string[] = [];
    function *ab(){
        yield 'a';
        yield 'b';
    }

    function *y(){
        yield "y";
        throw new Error("");
    }

    function *x(){
        yield "1";
        yield "2";
        return "3";
    }
  
    const {serial, w} = dev(path)({ab: ab(), x: x(), y: y()});
    const p = serial(["ab", w(["*"], ["y", "x"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "y", "1", "b"]);
});