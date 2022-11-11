# very simple pipeline alternative

Example of use:

```ts
import { context as C, dev} from 'yellow-machine';

async function f1(){...}
async function f2(){...}
async function f3(){...}
async function up(){...}
async function down(){...}

const {serial, w, p, parallel} = C({f3, up, down}) // we create a context given a namespace

// then we could do:

await serial([f1, f2, "f3"]) // f1 is executed, then f2 then f3 unless exception ("f3" is in the context)
//
await serial(["up", w(["*.js"], [k1, "k"]), "down"]) // w is watch some files and do the task associated ([k1, "k"]). If pressed key 'q', by exception or programmatically quit(), then we get out of watch and "down" is executed.
//
await parallel([w(["*.js"], [dojs]), w(["*.css"], [docss])])
//
const x = [w(["*.js"], [dojs]), w(["*.css"], [docss])]
await serial("up", p(x), "end")  // p is a wrapper over parallel
//
await serial("up", p([a, b, c], "all"), "end")  // default mode is "all". Possible values are: "all"|"race"|"allSettled"
//I would like to use mode "any" but I have to understand why typescript doesn't let me. I will study this issue
//if mode is "all" and for example "a" throws, then "end" will not execute.
//
await serial([f1, f2, 'throws']) //if f1, for example, throws, then f2 is not executed and the exception is raised
//
await serial([f1, f2, [f3, f4], f5]) //serial are default option when nested array is encountered

//note that you can also use generators. Useful in debug mode, or to test paths mocking real functions with generators
test('watch with generators', async ()=>{
    const path: string[] = [];
    function *ab(){
        yield 'a';
        yield 'b';
    }

    function *x(){
        yield "1";
        yield "2"; // you could throw some exception inside generators and outer w will stop immediately
        return "3";
    }
  
    const {serial, w} = dev(path)({ab: ab(), x: x()});
    const p = serial(["ab", w(["*"], ["x"]), "ab"]);
    await p;
    expect(path).toEqual(["a", "1", "2", "3", "b"]);
});
```

To test paths I think this is the way:

```js
function create(G, ctx){
    const {serial, w} = G(ctx);
    return serial(["ab", w(["*"], ["x"]), "ab"]); 
}

const p = create(dev(path), ctx_dev)
//or in production
const p = create(C, ctx_production)
```

This is a real example:

```js
const {context as C} = require("yellow-machine")
const npm = require('npm-commands')
const {docker} = require('./docker')
const {dgraph} = require('./dgraph')
const config = require("./config")

function test(){
    npm().run('test');
}

const {up, down} = docker({name: "my-container-dgraph", 
                           image: "dgraph/standalone:master", 
                           port: "8080", 
                           waitOn: "http://localhost:8080"
                        })

//compact mode
async function main(){
    const {serial, w} = C()
    await serial([up, 
               [w(["*.graphql", "*.test.js"], 
                  [loadSchema, test]), 
                down
               ]
             ]);
}

//or you prefer more flexibility
async function main(){
    const {watch, serial} = C()

    let ok = await serial([up])
    if(!ok){
        console.log("Could not start docker")
    }
    else{
        await watch(["./tests/*.js", "./schema/*.*"],  
                     async ({ctx: {quit}})=>{
            ok = await serial([dgraph(config), test]) 
            //if(!ok)   
            //    quit()
            });
        await serial([down])
    }
}

main()
```

Pipes can be nested: `[f1, [k1, k2], z1]`. If k1 throws, the sequence is: f1...k1...z1.

If we have `[f1, [k1, k2, 'throws'], z1]` if k1 throws then z1 is not executed.

If we have both: 

`[f1, w("*.js", [k2, k3]), z1]` and

```js
function k2({ctx}){
    ctx.quit();
}
```

Then the execution is f1 ... k2 ... k3 ... z1.

---

The types are:

```ts
export type Data = {data?: any, ctx: {quit: ()=>void}};

type F = ((arg0: Data) => any);

export type Tpipe = (Generator|AsyncGenerator|F|string|Tpipe)[];
```

The data returned from a function is assigned to the data property of the object type Data passed to the next function in the pipeline:

`nr` means not reentrant. Example:

```ts
await serial([
            w(["*.ts"], 
                nr([f])
            )
    ]);
```

`f` will execute triggered by `w`, but only if it exited yet. If not, the call is discarded.

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)