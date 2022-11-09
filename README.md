# very simple pipeline alternative

Example of use:

```js
const {serial, w, p} = C({f3, up, down}) // we create a context given a namespace

await serial([f1, f2, "f3"]) // f1 is executed, then f2 then f3 unless exception ("f3" is in the context)
//
await serial(["up", w(["*.js"], [k1, "k"]), "down"]) // w is watch some files and do the task associated. If pressed key 'q' or exception or programatically quit(), then we get out of watch and "down" is execute.
//
await parallel([w(["*.js"], [dojs]), w(["*.css"], [docss])])
//
const x = [w(["*.js"], [dojs]), w(["*.css"], [docss])]
await serial("up", p(x), "end")  // p is a wrapper over parallel
//
await serial([f1, f2, 'throws']) //if f1, for example, throws, then f2 is not executed and the exception is raised
//
await serial([f1, f2, [f3, f4], f5]) //serial are default option when array is encountered
//debug mode
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
//note that you can also use generators
```

This is an example with more flexibility:

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
                     async (quit)=>{
            ok = await serial([dgraph(config), test]) 
            //if(!ok)   
            //    quit()
            });
        await serial([down])
    }
}

main()
```

Pipes can be nested: [f1, [k1, k2], z1]. If k1 throws, the sequence is: f1...k1...z1.

In this case: [f1, [k1, k2, 'throws'], z1] if k1 throws then z1 is not executed.

If we have: 

`[f1, w("*.js", [k2, k3]), z1]` and

```js
function k2({ctx}){
    ctx.quit();
}
```

Then the execution is f1 ... k2 ... k3 ... z1.

The types are:

```js
export type Data = {data?: any, ctx: {quit: ()=>void}};

type F = ((arg0: Data) => any);

type Tpipe = (Generator|F|string|Tpipe)[];
```

The data returned from a task is assigned to the object passed to the next task in the pipeline:

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)