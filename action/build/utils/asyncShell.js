const { spawn } = require('child_process');

const logger = require("./logger")

const promiseFromChildProcess = (child) => {
  const out = []
  child.stdout.on("data", (data)=>{
    out.push(data)
  })
  const err = []
  child.stderr.on("data", (data) => {
    err.push(data)
  })
  return new Promise(function (resolve, reject) {
    child.on("close", (code)=>{
      if (code===0){
        if (err.length>0){
          logger.warn(err.join())
        }
        resolve(out.join())
      }else{
        reject(err.join())
      }
    });
  });
}

const asyncShell = (arg, options = {}) => {
  if(typeof arg === "string"){
    arg = arg.split(" ").filter(arg=>!!arg)
  }
  const [cmd, ...args] = arg
  const defaultOptions = { encoding: "utf8" }
  const childProcess = spawn(cmd, args, {...defaultOptions, ...options})
  return promiseFromChildProcess(childProcess)
}

module.exports = asyncShell