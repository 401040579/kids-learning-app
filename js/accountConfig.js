// 公网 HTTPS API 的 origin，例如 https://api.app.tao.irish。
// 留空时不请求后端，所有原有功能仍使用本机存档。
// 配置不含任何密码或管理员密钥；账号仅能通过服务器管理命令开通。
// Cookie 使用 SameSite=Strict，生产 API 应放在 tao.irish 下或由网页同源代理。
window.LEARNING_ACCOUNT_CONFIG = { apiBase: '' };
