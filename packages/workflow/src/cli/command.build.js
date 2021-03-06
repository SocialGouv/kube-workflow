const { configureDebug } = require("~common/utils/logger")
const build = require("~/build")

const program = require("./program")

const options = require("./options")

module.exports = program
  .command("build")
  .alias("b")
  .description(
    "Build manifests using kube-workflow with current directory configuration"
  )
  .addOption(options.env)
  .addOption(options.charts)
  .addOption(options.subcharts)
  .addOption(options.noTree)
  .addOption(options.inlineValues)
  .addOption(options.helmArgs)
  .addOption(options.cwd)
  .addOption(options.upload)
  .addOption(options.set)
  .addOption(options.baseDomain)
  .addOption(options.registry)
  .option("--output, -o", "enable direct output of manifest")
  .option(
    "--syntax-highlight, -s",
    "enable syntax highlight for yaml when used with -o"
  )
  .action(async (_opts, command) => {
    const opts = command.optsWithGlobals()
    configureDebug(opts.D)
    await build(opts)
  })
