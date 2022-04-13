const slug = require("~/utils/slug")
const deepmerge = require("~/utils/deepmerge")

const { buildCtx } = require("./ctx")

const isVersionTag = require("kube-workflow-common/utils/is-version-tag")

module.exports = (values) => {
  
  const {
    ENVIRONMENT,
    RANCHER_PROJECT_ID,
    RANCHER_PROJECT_NAME,
    GIT_REPOSITORY,
    GIT_REF,
    GIT_SHA,
    GIT_HEAD_REF,
  } = buildCtx.require("env")

  const gitBranch = (GIT_HEAD_REF || GIT_REF)
    .replace("refs/heads/", "")
    .replace("refs/tags/", "")

  const branchSlug = slug(gitBranch)

  const env = ENVIRONMENT
  const isProd = env === "prod"
  const isPreProd = env === "preprod"
  const isDev = !(isProd || isPreProd)

  const repository = GIT_REPOSITORY
  const repositoryName = repository.split("/").pop()

  const subdomain = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const namespace = isProd
    ? repositoryName
    : isPreProd
    ? `${repositoryName}-preprod`
    : slug(`${repositoryName}-${gitBranch}`)

  const isRenovate = gitBranch.startsWith("renovate")

  const ttl = isDev ? (isRenovate ? "1d" : "7d") : ""

  const sha = GIT_SHA

  const shortSha = sha.slice(0, 7)

  let imageTag
  if (isPreProd) {
    imageTag = `preprod-${sha}`
  } else if (isProd) {
    if (isVersionTag(gitBranch)) {
      gitBranch.substring(1)
    } else {
      imageTag = "prod"
    }
  } else {
    imageTag = `sha-${sha}`
  }

  const rootSocialGouvDomain = "fabrique.social.gouv.fr"

  const domain = isProd ? rootSocialGouvDomain : `dev.${rootSocialGouvDomain}`

  const host = `${subdomain}.${domain}`

  const registry = "ghcr.io/socialgouv"
  const imageRepository = repositoryName

  const rancherProjectId = RANCHER_PROJECT_ID

  const pgSecretName = isProd
    ? "pg-user"
    : isPreProd
    ? "pg-user"
    : `pg-user-${branchSlug}`

  const productionDatabase = repositoryName

  const pgDatabase = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `autodevops_${branchSlug}`

  const pgUser = isProd
    ? productionDatabase
    : isPreProd
    ? "preprod"
    : `user_${branchSlug}`

  const rancherProjectName = RANCHER_PROJECT_NAME || repositoryName
  const jobNamespace = `${rancherProjectName}-ci`

  const imageProject = ""
  // const imageProject = rancherProjectName

  const defaultValues = {
    global: {
      repository,
      repositoryName,
      isDev,
      isProd,
      isPreProd,
      ttl,
      namespace,
      rancherProjectId,
      pgSecretName,
      pgDatabase,
      pgUser,
      host,
      domain,
      registry,
      imageProject,
      imageRepository,
      imageTag,
      branchSlug,
      gitBranch,
      jobNamespace,
      sha,
      shortSha,
      env,
      extra: {
        jobs: {
          sharedStorage: {
            enabled: true,
          },
        },
      },
    },
  }

  values = deepmerge({}, defaultValues, values)

  for (const key of Object.keys(values)) {
    if (!Object.keys(values[key]).includes('enabled')) {
      values[key].enabled = true
    }
  }

  return values
}
