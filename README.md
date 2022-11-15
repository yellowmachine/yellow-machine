# very simple pipeline alternative

Example of use:

```ts
import { context as C, dev, watch} from 'yellow-machine';

async function f1(){...}
async function f2(){...}
async function f3(){...}
async function up(){...}
async function down(){...}

const {serial, w, p, parallel} = C({f3, up, down}, {w: watch(["*.js"])}) // we create a context given a namespace

// then we could do:

await serial([f1, f2, "f3"]) // f1 is executed, then f2 then f3 unless exception ("f3" is in the context)
//
await serial(["up", w([k1, "k"]), "down"]) // w is watch some files and do the task associated ([k1, "k"]). If pressed key 'q', by exception or programmatically quit(), then we get out of watch and "down" is executed.
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
            ok = await serial([loadSchema, test]) 
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
export type F = ((arg0: Data) => any);
type C = Generator|AsyncGenerator|F|string|Tpipe;
export type Tpipe = C[];
export type Serial = (tasks: Tpipe|C, ctx?: any) => Promise<any>;
export type Parallel = (tasks: Tpipe|C, mode?: "all"|"race"|"allSettled", ctx?: any) => Promise<any>;

```

The data returned from a function is assigned to the data property of the object type Data passed to the next function in the pipeline:

`nr` means not reentrant. Example:

```ts
const {w, serial, nr} = C();

await serial([
            w(["*.ts"], 
                nr([f]) // please note that nr(f) implies nr([f, 'throws'])
            )
    ]);
```

`f` will be executed triggered by `w`, but only if it exited yet. If not, the call is discarded.

You can write your own logic. Suppose you want to write a `nr`, this is how you would do:

```ts
function custom_nr({serial}:{serial: Serial}){
    return function (f: F|Tpipe){
        let exited = true;
        return async function(data: Data){
            if(exited){
                try{
                    exited = false;
                    return await serial(f, data.ctx);
                }finally{
                    exited = true;
                }
            }
        };
    };
}
//...
const {w, serial} = C();

const nr = custom_nr({serial});
```

You can enable or disable some logs:

```ts
import { DEBUG, SHOW_QUIT_MESSAGE } from 'yellow-machine';

//default false
DEBUG.v = true // will log all exceptions cached

//default false
SHOW_QUIT_MESSAGE.v = true // will print in console the message "Press q to quit!" when watching
```

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)


Tests: `npm run test`

Work in progress:

```ts
await serial("a|b|c"); // ok
await serial(["i", "a|b|c", "j"]); // ok
await serial("a|p[x|y]") //ok

//shorthand for "a|[b]|c"
await serial(["a[b]c"]) // (ok) if b throws, it's cached immediately and c is executed
await serial(["a[b!]c"]) // (ok) if b throws, c is not executed 
```

What about this?:
```ts
import {C as context, partial_w} from 'yellow-machine';

const {serial} = C({up, load, test, 
                    w_js_grapql: //starts with "w_", so it will be a watch 
                        partial_w(["./src/*.js", "./schema/*.graphql"])
                });

await serial(["up[w_js_graphql[load|test]|down]"])

const partial_w = (files: string[]) => (w: (arg0: string[], arg1: Tpipe|F)=>Promise<any>, tasks: Tpipe|F) => w(files, tasks); 

```
I'm not sure if it's useful or not because I want as simple as possible.