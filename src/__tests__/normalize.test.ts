import { dev, g, type Jpipe} from '../index';

test('normalize: watch with generic generator and parallel', async ()=>{
    const path: string[] = [];
    const path2: string[] = [];
  
    const { serial, p, w } = dev(path)({f: g(["1", "1"]), ab: g(['a', 'b'])});
    const { run } = dev(path2)({f: g(["1", "1"]), ab: g(['a', 'b'])});
    const x = serial([
            w(["*"], 
                [p(["f", "ab"])]
            )
    ]);
    await x;
    const z: Jpipe = [{w: [["*"], [{p: ["f", "ab"]}]]}];
    await run({serial: z});
    expect(path).toEqual(path2); //["1", "a", "1", "b"]);
});