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