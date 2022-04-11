const validators = ["resources-uniqness", "missing-keys", "needs"]

module.exports = (manifests, values) => {
  for (const validator of validators) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    require(`./${validator}`)(manifests, values)
  }
}