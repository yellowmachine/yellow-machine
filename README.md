# very simple pipeline alternative

Example of use:

```js
const {pipe, watch} = require("yellow-machine")
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
    let ok = await pipe(up)
    if(!ok){
        console.log("Could not start docker")
    }
    else{
        await watch({files: ["./tests/*.js", "./schema/*.*"], 
                     quit: 'q', 
                     f: async (quit)=>{
            ok = await pipe(dgraph(config), test) 
            //if(!ok)   
            //    quit()
        }})
        await pipe(down)
    }
}

main()
```

It starts a docker image and wait for it to be ready, then, if it's ok, it enters to do a watch. It executes a function every time a file changes (given array of paths). If you press 'q' then it exits watch and do pipe down, i.e., stops docker. (You can stop watch programatically by executing the `quit` function).

`pipe` executes async functions serially, passing data from one to next. If an error occurs, then pipe catch the error unless you do something like this. `await pipe(f1, f2, f3, 'throws')`. In this case, if for example *f2* throws, then *f3* does not execute and error is thrown.

In this case `await pipe(dgraph(config), test)`: it loads a schema to dgraph and if there's no error then does the test. But if dgraph doesn't load the schema because for example there's a syntax error on the schema.graphql file, then `test` is not executed.

You can see a repo using this library:

[example testing a dgraph](https://github.com/yellowmachine/example-test-your-dgraph)