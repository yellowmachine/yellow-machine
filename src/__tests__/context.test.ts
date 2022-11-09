import { context as C} from '../index';

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
  
    const p = C({a: a()}, true, path).serial(["a", "a"]);
    await p;
    expect(path).toEqual(["a", "b"]);
});