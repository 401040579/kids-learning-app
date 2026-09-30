# 受管理的学习账号服务

本服务与机器人大脑独立运行，只提供账号和学习备份。没有公开注册、用户创建、密码重置或机器人控制接口。
只有用户明确要求时，管理员才执行 `backend.manage` 开通账号。首个账号为 `iris`，显示名为 `Iris`。

## 本地开发与测试

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
.venv/bin/python -m pytest backend/tests -q
node --test tests/*.test.cjs
```

Python 3.12+。数据库必须在项目目录之外，防止被静态站点公开；默认路径为
`~/.local/share/kids-learning/learning.sqlite3`，权限为 0600。

环境变量：

| 变量 | 默认值 / 用途 |
| --- | --- |
| `LEARNING_DB` | 上述数据库路径 |
| `LEARNING_ORIGINS` | `https://app.tao.irish`；逗号分隔的精确网页来源，不用 `*` |
| `LEARNING_DEVELOPMENT` | 仅本机 HTTP 测试设置 `1`；生产禁止设置 |

```bash
# 生产：由 HTTPS 反向代理转发到此独立服务，仅监听回环地址。
.venv/bin/python -m uvicorn backend.service:create_app --factory --host 127.0.0.1 --port 8091 --workers 1 --no-access-log

# 只在用户明确要求时执行；交互隐藏输入密码，不将密码写进命令参数或仓库。
.venv/bin/python -m backend.manage create iris --name Iris
.venv/bin/python -m backend.manage reset-password iris
.venv/bin/python -m backend.manage disable iris
```

开通不会覆盖已有账号。重置和停用会立即撤销既有会话；禁用账号后重置密码也不会自动重新启用。
密码至少 16 字符，建议随机生成并由家长保存。数据库只保存 Argon2id 哈希，登录会话只保存令牌摘要。

## 网页接入

把 `js/accountConfig.js` 的 `apiBase` 设为实际公网 HTTPS origin，例如 `https://api.app.tao.irish`。
留空时不请求后端，原网页继续独立工作。生产 API 应与网页同站（如同属 `tao.irish`），或通过同源 `/api/` 反向代理访问，
以便使用 `Secure + HttpOnly + SameSite=Strict` Cookie。不能仅把任意不同站点的隧道 URL 填进去。

所有写接口检查 Origin，登录后还检查 CSRF；CORS 仅允许配置的精确来源。
只反代这个学习服务，不能反代机器人大脑 8090 的全部接口。公网网关还应配置请求大小与速率上限。
Tailscale 可以继续用于 SSH 运维，但不是用户登录或访问条件。

## 当前能力和限制

- Iris 登录后可手动保存、下载按账号隔离的学习备份。登录/退出不改本机记录，也不自动导入游客历史。
- 学习备份不上传 `parentNotifyConfig`、`videoWhitelistCache`；带 `scope: learning`，恢复时保留未包含的本机设置。
- 本机已有记录由家长确认归属后上传；首次合并不能凭设备上的累计分数推断知识点掌握度。
- 更新采用版本号比较。其他设备已保存则返回 409，必须查看最新备份后再决定。每个账号目前仅保留最新一份云备份。
- 请求最大 8 MiB；登录 4 KiB。默认每账号 15 分钟最多 8 次尝试，全服务每分钟 30 次，重启不清空限流。
- 登录会话有效期 7 天，最多 8 个设备。所有 API 返回 `Cache-Control: no-store`，SW 也跳过 `/api/`。
- 账号凭证不写 localStorage；第三方同源脚本/XSS 仍可代表当前会话请求 API。上线私人数据前应收紧第三方脚本、修复不可信 HTML 插入点。
- 数学/英语/中文/科学的新答题日志使用 IndexedDB 队列自动同步、断网补传、跨设备拉取；游客日志不会上传。旧 localStorage 分数与作品仍采用手动备份，尚无完整多孩子存档切换、Marble 掌握度或机器人连接。
- 日志在作答当下固定账号，退出或切换账号不会重新标记队列。离线重新打开网页进入游客模式，联网登录原账号后补传该账号的队列。答题日志需单独导出，不在 31 键本机备份里。
- 本机记录退出后保留，共用设备时需家长自行管理本机备份。云端数据退出后不可访问。
- 生产需要 HTTPS 入口、进程自启、异机备份和恢复验证；使用 SQLite Backup API 生成备份副本，勿直接复制正在写的数据库文件。

## 接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 健康状态，公开且不含孩子信息 |
| POST | `/api/login` | 用户名和密码登录 |
| GET | `/api/account` | 当前账号与 CSRF token |
| POST | `/api/logout` | 撤销当前会话 |
| GET | `/api/snapshot` | 当前账号的备份和版本 |
| PUT | `/api/snapshot` | `{revision, backup}`；只写当前会话所属账号 |
| POST | `/api/learning/events` | `{expected_account_id, events}`；1–100 条，最大 128 KiB，幂等追加 |
| GET | `/api/learning/events` | `expected_account_id` + `after` 游标 + `limit`（1–100），读取当前账号记录 |

逐题记录包含 ID、带时区的答题时间、来源、学科、稳定题目 ID、题目、期望答案、实际答案和结果。
按写入顺序分页，迟到的离线记录不会被时间游标漏掉。同 ID 同内容重传不会重复保存，内容冲突返回 409 并回滚整批。
`expected_account_id` 用于防止切换账号后错投离线队列，不能指定数据归属；不匹配会话则返回 409。
记录统计只能说明练习次数与正确率，不能据此断言孩子掌握了 Marble 知识点。机器人记录需另做受信适配器，当前拒绝 `source: robot`。

错误语义：401 未登录/会话过期，403 来源或 CSRF 不符，409 版本冲突，413 请求过大，422 备份格式错误，429 限流。
账号 ID 一律从服务端会话取得，忽略客户端伪造的 `X-User-Id` 或 `account_id`。
