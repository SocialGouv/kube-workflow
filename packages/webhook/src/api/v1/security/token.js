const { ctx } = require("@modjo-plugins/core")

module.exports = () => async (req, _scopes, _schema) => {
  const { token } = req.query
  if (!token) {
    return false
  }
  const webhookToken = ctx.require("config.project.webhook.token")
  return token === webhookToken
}
