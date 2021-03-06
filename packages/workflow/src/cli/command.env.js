const selectEnv = require("~/utils/select-env")

const { buildCtx } = require("~/build/ctx")
const program = require("./program")

const options = require("./options")

module.exports = program
  .command("env")
  .description("Infer env from ref or branch")
  .addOption(options.env)
  .addOption(options.cwd)
  .argument("[ref]", "the ref")
  .action(async (ref, _opts, command) => {
    const opts = command.optsWithGlobals()
    buildCtx.provide()
    const env = await selectEnv({
      opts,
      ref,
      cwd: opts.cwd,
    })
    process.stdout.write(env)
  })
