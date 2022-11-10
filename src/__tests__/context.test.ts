import { context as C, dev, g} from '../index';


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

test('watch with async generators', async ()=>{
    const path: string[] = [];
    async function *ab(){
        yield await Promise.resolve('a');
        return await Promise.resolve('b');
    }

    async function *x(){
        yield await Promise.resolve("1");
        yield await Promise.resolve("2");
        return await Promise.resolve("3");
    }
  
    const {serial, w} = dev(path)({ab: ab(), x: x()});
    const p = serial(["ab", w(["*"], ["x"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "1", "2", "3", "b"]);
});

test('watch with generators and exception v0', async ()=>{
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
    expect(path).toEqual(["a", "y", "1", "throws"]);
});

test('watch with generators and parallel', async ()=>{
    const path: string[] = [];

    function *f(){
        yield "1";
        return "1";
    }

    function *ab(){
        yield 'a';
        return 'b';
    }
  
    const { serial, p, w } = dev(path)({f: f(), ab: ab()});
    const x = serial([
            w(["*"], 
                [p(["f", "ab"])]
            )
    ]);
    await x;
    expect(path).toEqual(["1", "a", "1", "b"]);
});

test('watch with generic generator and parallel', async ()=>{
    const path: string[] = [];
  
    const { serial, p, w } = dev(path)({f: g(["1", "1"]), ab: g(['a', 'b'])});
    const x = serial([
            w(["*"], 
                [p(["f", "ab"])]
            )
    ]);
    await x;
    expect(path).toEqual(["1", "a", "1", "b"]);
});

test('watch with generators and exception v1', async ()=>{
    const path: string[] = [];
  
    const {serial, w} = dev(path)({ab: g(["a", "b"]), x: g(["1", "2", "3"]), y: g(["y", "throw"])});
    const p = serial(["ab", w(["*"], ["y", "x"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "y", "1", "throws"]);
});

//should w throw?
test('watch with generators and exception v2', async ()=>{
    const path: string[] = [];
  
    const {serial, w} = dev(path)({ab: g(["a", "b"]), x: g(["1", "2", "3"]), y: g(["y", "throw"])});
    const p = serial(["ab", w(["*"], ["y", "x", "throws"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "y", "1", "throws"]);
});
