# very simple pipeline alternative

Example of use:

```js
const {serial, watch} = require("yellow-machine")
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

It starts a docker image and wait for it to be ready, then, if it's ok, it enters to do a watch. It executes a function every time a file changes (given array of paths). If you press 'q' then it exits watch and do serial down, i.e., stops docker. (You can stop watch programatically by executing the `quit` function).

`serial` executes async functions serially, passing data from one to next. If an error occurs, then pipe catches the error unless you do something like this. `await serial(f1, f2, f3, 'throws')`. In this case, if for example *f2* throws, then *f3* does not execute and error is thrown.

In this case `await serial(dgraph(config), test)`: it loads a schema to dgraph database and if there's no error then does the test. But if dgraph doesn't load the schema because for example there's a syntax error on the schema.graphql file, then `test` is not executed.

Pipes can be nested: [f1, [k1, k2], z1]. If k1 throws, the sequence is: f1...k1...z1.

In this case: [f1, [k1, k2, 'throws'], z1] if k1 throws then z1 is not executed.

If we have: 

[f1, w("*.js", [k2, k3]), z1] and

```js
function k2({ctx}){
    ctx.quit();
}
```

Then the execution is f1 ... k2 ... k3 ... z1.

`w` is just a wrap over watch:

```js
export function w(files: string[], f: Tpipe){
        return () => watch(files, f);
}
```

`watch` is:

```js
export function watch(files: string[], f: Tpipe|((arg0: (()=>void)) => void))
```

And the types are:

```js
export type Data = {data?: any, ctx: {quit: ()=>void}};
type F = ((arg0: Data) => any);
type Tpipe = (F|'throws'|Tpipe)[];
```

The data returned from a task is assigned to the object passed to the next task in the pipeline:

```js
const data = {
        data: null,
        ctx: ctx  || {}
    };
...
    for(const t of tasks){
        if(typeof t === 'function'){
            data.data = await t(data);
        }else if(Array.isArray(t)){
            await pipe(t, data);
        }
    }
```

A real example:

```js
await serial([up, 
            [w(["*.graphql", "*.test.js"], 
                [loadSchema, test]
                ), 
             down
            ]
        ]);
```

You can see a repo using this library:

[example testing a dgraph schema](https://github.com/yellowmachine/example-test-your-dgraph)