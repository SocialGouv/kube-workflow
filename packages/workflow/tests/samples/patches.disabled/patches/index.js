const patches = ["hashwords-label"]

module.exports = (manifests, values) => {
  for (const patch of patches) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    manifests = require(`./${patch}`)(manifests, values)
  }
  return manifests
}
