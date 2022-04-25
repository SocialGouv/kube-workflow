const fs = require("fs-extra")
const yaml = require("js-yaml")
const deepmerge = require("~common/utils/deepmerge")

const getDirectories = require("~common/utils/get-directories")
const loadYamlFile = require("~common/utils/load-yaml-file")
const getYamlPath = require("~common/utils/get-yaml-path")

const { buildCtx } = require("./ctx")

const defaultChart = (name, umbrellaChart)=>{
  const { apiVersion, appVersion, version } = umbrellaChart
  return {
    apiVersion,
    version,
    appVersion,
    name,
  }
}

const defaultValues = (_name, _umbrellaChart) => {
  return {
    enabled: false
  }
}

module.exports = async (values) => {
  const { KWBUILD_PATH, WORKSPACE_KW_PATH } = buildCtx.require("env")
  
  const chart = yaml.load(
    await fs.readFile(`${KWBUILD_PATH}/Chart.yaml`, {
      encoding: "utf-8",
    })
  )

  const { dependencies } = chart

  // import subcharts from project
  const allChartNames = [...(new Set(
    (await Promise.all([
      getDirectories(`${KWBUILD_PATH}/charts`),
      getDirectories(`${WORKSPACE_KW_PATH}/charts`),
    ])).reduce((acc, dirNames) => [...acc, ...dirNames], [])
  ))]

  for (const c of allChartNames){
    
    const chartDir = `${KWBUILD_PATH}/charts/${c}`
    
    // default Chart file
    const chartFile = `${chartDir}/Chart.yaml`
    if(!(await fs.pathExists(chartFile))){
      await fs.writeFile(chartFile, yaml.dump(defaultChart(c, chart)))
    }
    
    // default values files with minimum
    let valuesFile = await getYamlPath(`${chartDir}/values`)
    const chartValues = valuesFile ? yaml.load(await fs.readFile(valuesFile,{encoding:"utf8"})) : {}
    const defaultValuesObj = deepmerge(chartValues, defaultValues(c, chart))
    if (!valuesFile){
      valuesFile = `${chartDir}/values.yaml`
    }
    await fs.writeFile(valuesFile, yaml.dump(defaultValuesObj))
    
    // import subcharts in umbrella chart dependencies
    const subchart = yaml.load(await fs.readFile(chartFile))
    if (!dependencies.find(dependency => dependency.name === subchart.name)){
      dependencies.push({
        name: subchart.name,
        repository: `file://./charts/${c}`,
        condition: `${subchart.name}.enabled`,
        version: subchart.version,
      })
    }
  }
  
  // compile extra instances from values
  const dependenciesByName = dependencies.reduce((acc, value) => {
    acc[value.name] = value
    return acc
  }, {})

  const componentKeys = Object.keys(values)

  for (const { name } of [...dependencies]) {
    for (const componentKey of componentKeys) {
      const isAnInstanceOf = componentKey.startsWith(`${name}-`)

      // create subcharts alias for components instances
      if (isAnInstanceOf) {
        dependencies.push({
          ...dependenciesByName[name],
          alias: componentKey,
          condition: `${componentKey}.enabled`,
        })
      }

      // enable common extra features for used components
      if (
        (componentKey === name || isAnInstanceOf) &&
        values.global.extra[name] && values[name].enabled
      ) {
        values.global.extra[name].enabled = true
      }
    }
  }
  await fs.writeFile(`${KWBUILD_PATH}/Chart.yaml`, yaml.dump(chart))

  return chart
}
