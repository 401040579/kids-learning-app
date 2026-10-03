# 受管理的学习账号服务

本服务与机器人大脑独立运行，提供账号、学习存档、逐题记录及受信机器人数据适配器。没有公开注册、用户创建、密码重置或机器人控制接口。
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

把 `js/accountConfig.js` 的 `apiBase` 设为实际公网 HTTPS origin，例如 `https://api.tao.irish`。
留空时不请求后端，原网页继续独立工作。生产 API 应与网页同站（如同属 `tao.irish`），或通过同源 `/api/` 反向代理访问，
以便使用 `Secure + HttpOnly + SameSite=Strict` Cookie。不能仅把任意不同站点的隧道 URL 填进去。

所有写接口检查 Origin，登录后还检查 CSRF；CORS 仅允许配置的精确来源。
只反代这个学习服务，不能反代机器人大脑 8090 的全部接口。公网网关还应配置请求大小与速率上限。
Tailscale 可以继续用于 SSH 运维，但不是用户登录或访问条件。

## 当前能力和限制

- Iris 登录后使用独立的学习存档并自动同步，新设备启动时恢复；游客存档保留原样且不自动导入。
- 账号学习备份不上传 `parentNotifyConfig`、`videoWhitelistCache`、`appLanguage`；带 `scope: learning`，恢复时保留未包含的本机设置。
- 本机已有记录由家长确认归属后上传；首次合并不能凭设备上的累计分数推断知识点掌握度。
- 更新采用版本号比较。其他设备已保存则返回 409，必须查看最新备份后再决定。每个账号目前仅保留最新一份云备份。
- 请求最大 8 MiB；登录 4 KiB。默认每账号 15 分钟最多 8 次尝试，全服务每分钟 30 次，重启不清空限流。
- 登录会话有效期 7 天，最多 8 个设备。所有 API 返回 `Cache-Control: no-store`，SW 也跳过 `/api/`。
- 账号凭证不写 localStorage；第三方同源脚本/XSS 仍可代表当前会话请求 API。上线私人数据前应收紧第三方脚本、修复不可信 HTML 插入点。
- 数学/英语/中文/科学的新答题日志使用 IndexedDB 队列自动同步、断网补传、跨设备拉取；游客日志不会上传。分数、错题和已保存作品通过 AppStorage 按账号存储；云备份采用乐观版本控制，冲突须家长选择本机或云端。尚未推断 Marble 掌握度。
- 日志在作答当下固定账号，退出或切换账号不会重新标记队列。离线重新打开网页进入游客模式，联网登录原账号后补传该账号的队列。答题日志需单独导出，不在 31 键本机备份里。
- 本机记录退出后保留，共用设备时需家长自行管理本机备份。云端数据退出后不可访问。
- 独立服务已在 Orin `~/robots/kids-learning-service` 运行，仅监听 `127.0.0.1:8091`。HTTPS 公网入口 `https://api.tao.irish` 已接通并通过现有 Iris 登录/退出验收，网页 `apiBase` 已配置此地址。

## Orin 运行与备份（2026-09-29 已验证）

```bash
cd ~/robots/kids-learning-service
# Linux 专用，独立 flock 锁；已有实例时直接退出，不重启机器人。
/bin/sh backend/run.sh
# 对活跃数据库生成一致性副本，不使用普通 cp。
.venv/bin/python -m backend.backup
```

用户 crontab 已保留原有机器人自启，新增学习服务的 `@reboot`、每 5 分钟启动兜底、每天本地时间 04:35 备份。
无需 sudo。`run.sh` 的锁随服务退出释放；重复启动验证仅保留一个实例。日常空闲 RSS 实测约 46 MiB。
日志在 `~/.local/share/kids-learning/service.log`，备份日志同目录 `backup.log`；不记录 HTTP 访问日志或明文密码。

备份默认位于 `~/.local/share/kids-learning-backups`，目录 0700、文件 0600，保留最近 14 份。
副本撤销所有会话，转换成独立单文件并检查 `PRAGMA integrity_check`，成功后才清理旧副本。
WAL 数据库不能直接复制，也不能在 SQLite 连接仍打开时改名；Python `with sqlite3.connect()` 不会关闭连接。

已手动复制一份私有副本到 Mac，在临时数据库上验证完整性、Iris 登录和事件表读取；未覆盖生产库。
**每日异机自动备份还没配置**，Orin 本机副本无法抵御整机/磁盘丢失。异机传输与恢复操作不得把副本放进 GitHub Pages 仓库。
真正恢复前应暂停学习服务及它的兜底任务、保留原库和旁路日志文件；先在临时目录验证备份，再停机替换。
恢复后需重新登录；不得误用 `brain_proxy` 的重启手法。

验证命令：后端 `pytest backend/tests -q`（39 例），前端 `node --test tests/*.test.cjs`（31 例）。
安装 Playwright 并有 Chrome 时可运行 `node tests/browser-learning.cjs`：临时数据库与测试账号覆盖真实 IndexedDB、跨设备、断网、丢失应答重传和切换账号。

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
记录统计只能说明练习次数与正确率，不能据此断言孩子掌握了 Marble 知识点。公开上传接口拒绝 `source: robot`，机器人记录仅由服务器适配器导入。

错误语义：401 未登录/会话过期，403 来源或 CSRF 不符，409 版本冲突，413 请求过大，422 备份格式错误，429 限流。
账号 ID 一律从服务端会话取得，忽略客户端伪造的 `X-User-Id` 或 `account_id`。

## 机器人数据桥（2026-09-30）

`backend.tutor_bridge` 每 10 秒只读机器人 SQLite（mode=ro），原子导入事件与游标；不接触 SDK 或硬件 API。
新日志使用机器人生成的 UUID/UTC 时间，旧日志按配置时区解释；源库重新创建时扫描恢复，事件 ID 去重。
Marble 保留 topic_id / taxonomy_version / robot 来源。unclear 不记错，不把网页题猜成 Marble 掌握度。
目前仅适用于原家教的单个 Iris 孩子，不能把绑定改成另一个孩子来复用旧日志。

绑定已有账号（不会创建账号），在 Orin 学习服务目录执行：

```bash
.venv/bin/python -m backend.tutor_bridge iris \
  --source ~/robots/vector-project/data/tutor.db \
  --taxonomy ~/robots/vector-project/data/marble/topics.json
```

私有配置 `~/.local/share/kids-learning/robot-bridge.json`，题单 `robot-plan.json`，均在静态目录之外。
可用 `LEARNING_ROBOT_CONFIG` 指定私有配置路径。配置在进程启动读取，修改后重启独立服务。
禁用账号停止导入并写空题单；同机管理员具有原有机器人管理权限，文件不是用于隔离本机管理员的边界。

`GET /api/tutor/plan?expected_account_id=...` 需要账号登录，返回最多两道待复习基础加减法及数据桥状态，不提供启动/唤醒机器人操作。
只选 0–30 加减法并从稳定题目 ID 重算答案；按实际答题时间判断最新正确/错误，迟到的离线错题不盖过较新答对。
机器人当天已练但答错的题第二天再练；听不清仍保持原错误。网页可直接练题，机器人下次正常口令/定时会话才读取。

机器人读取私有题单时检查姓名、账号标识、0600 权限和 120 秒过期时间，再次重算题目；最多占用原会话的两个名额。
题单失效时回退原 Marble。新题 ID 仅进 tutor_log，不写 tutor_topics，不走 Marble 回溯，原勿扰/夜间/互斥/停止约束仍有效。
代码在机器人仓库 `src/learning_bridge.py`、`src/tutor.py`、`src/brain_proxy.py`，测试为该仓库全套 116 项。
真实 Chrome 临时数据链路已覆盖网页错题→机器人题单→导入 Jarvis 结果→另一设备报告；未代替 Iris 的实际口语识别验收。

部署验收（2026-09-30）：生产 Iris 登录/退出、会话归属、数据桥 ready 已验证；检查后生产事件与家教日志仍为 0，未写入测试作答。
机器人数据库新增日志列已生效，`/tutor/stop` 返回 idle。当前两台 SDK 都未连接，儿童真机口语验收未完成。
GitHub Pages v78 已构建，公网 `apiBase` 仍空；DNS 管理入口缺失阻止公网登录上线。
真实 Chrome 另验证同账号第二标签页禁止写入，总计 13 个场景，无页面异常。
线上 Chrome 验证游客模式、v78 缓存激活与离线重载通过。测试中的异步条件不能直接交给 waitForFunction（本机运行时把 Promise 当作 truthy），记录数量改为 evaluate 等待完成后比较和限时重试；上述 13 场景已按真实数量重新验证。

## 复习顺序修正（2026-10-02）

待复习题的最新有效结果按验证后统一为 UTC 毫秒的 `payload.occurred_at` 排序，
同毫秒才按上传 `seq` 决胜。表中的秒精度 `occurred_at` 保持兼容，不需数据库迁移。
网页 API 与私有题单使用同一绑定时区判断“机器人当天已练”。
本地后端全套 43 项通过，新增回归覆盖同秒迟到的旧错/旧对、同毫秒顺序及跨日时区边界。
数据桥 `ready` 仅表示学习数据处理成功，不表示 Jarvis / Friday 已连接。

## 固定课程与自动异机备份（2026-10-02）

新增 `backend/study.py`、严格 v2 课程事件与 `GET /api/study/plan`，保留 v1 及旧加减法接口。部署时必须同时复制 `data/curriculum.json`；课程只用固定选项，不能从网页上传任意题干当成已审核题。详见 [短课与复习](../docs/短课与复习.md)。没有新增账号开通入口、后台机器人控制或本地模型。

固定课程复习进入同机私有题单，机器人读取部署在学习服务 `data/` 的相同版本目录。先部署学习服务和课程，再部署机器人读取器；回滚可分别回到旧加减法实现。旧读取器遇到 lesson 题会安全退回 Marble；不可依赖它继续识别新课。

Mac 异机工具：`python3 scripts/offsite_backup.py --config <私有配置路径>`。配置字段为 `host/service_directory/backup_directory/destination/keep`，SSH host 用已有管理员身份，两个远端目录需绝对路径；配置 0600，目标必须在项目外。工具先由服务器 Backup API 生成一致性、零会话副本，拉取校验成功后才清理本机旧副本。失败不输出子进程正文，不删除旧副本。

本机用户 LaunchAgent `local.kids-learning.offsite-backup` 已安装，每天 09:15 尝试，Mac 保留 30 份；它依赖本机开机和 SSH 可达。可用 `launchctl print gui/$(id -u)/local.kids-learning.offsite-backup` 查看最近退出码，停用用 `launchctl bootout gui/$(id -u)/local.kids-learning.offsite-backup`。实际配置、日志和数据库不得提交。

## 用户级 HTTPS 隧道（2026-10-02）

网页继续由 GitHub Pages 托管。学习 API 使用同站的一层子域名 `api.tao.irish`，经 Cloudflare Tunnel 到 Orin 回环端口 8091。免费 Universal SSL 的常规覆盖包含一层子域名，不能把 `api.app.tao.irish` 当成自动获得证书的地址。

`backend/tunnel.example.yml` 仅为不含凭据的模板。实际配置保存到 `~/.local/share/kids-learning/tunnel/config.yml`，专用隧道凭据放同目录；目录 0700、文件 0600。Orin 仅持有这个隧道的凭据，不接收 Mac 的 Cloudflare 账号管理证书。二进制从官方 ARM64 release 下载，核对官方 SHA256 后装到 `~/.local/bin/cloudflared`。

入口必须同时匹配 `api.tao.irish` 与 `^/api/`，其他路径或主机返回 404。不能把默认兜底改成 8091，也不能转发 8090。隧道出站连接，不需要开放家中路由器端口；Tailscale 仍用于管理员 SSH。

```bash
# 用户级、独立锁，不影响学习 API 或机器人大脑。
/bin/sh ~/robots/kids-learning-service/backend/run-tunnel.sh
~/.local/bin/cloudflared tunnel --config ~/.local/share/kids-learning/tunnel/config.yml ingress validate
# 本机健康仅表明隧道已连接，不等于公网 DNS/TLS 已就绪。
curl --fail http://127.0.0.1:8092/ready
```

用户 crontab 保留现有任务，隧道另有 `@reboot` 和每 5 分钟的启动兜底；`run-tunnel.sh` 持独立 flock 锁，重复运行直接退出。隧道日志为 `~/.local/share/kids-learning/tunnel.log`，不用 debug 记录请求头。8092 指标仅监听回环。

DNS 迁移前备份完整记录，逐条保留邮件 MX/SPF/DKIM、GitHub Pages CNAME 和域名验证；自动扫描可能漏记录。已有 DNSSEC 时先移除旧 DS，并从所有父区权威实际确认移除时算起，按 DS 的 TTL 留足缓存过期时间，之后再改 NS。切换后恢复 Cloudflare 父区 DS 还必须等待旧子区权威 NS 的缓存期限；本域实测父 DS 为 3600 秒、旧子区 NS 为 21600 秒，不能都按 1 小时算。不能只看到管理界面保存成功就认为缓存已清空，也不能带着旧 DS 直接切到不同签名密钥的 DNS 服务。

Squarespace 默认托管 DNS 的 DNSSEC 开关会立即影响签名，而注册局 DS 异步更新；本轮曾出现几分钟的验证型解析器 SERVFAIL。重新打开会生成不同 KSK，不能把开关当成原密钥回滚。默认模式没有本轮已验证的独立父 DS 删除入口；迁移须持续核对父 DS 与实际 DNSKEY，而非反复开关。自定义 NS 模式可手动管理第三方 DS；必须确认新 DS 匹配 Cloudflare DNSKEY 且旧 NS 缓存过期后才添加。

Squarespace 邮件转发支持自定义 NS。切换后在原 Email 页面检查转发规则保留、无 Action required；若出现提示，使用该域 Review instructions 的 2 条 MX / 2 条 TXT 核对新权威记录。保留原规则，不删除重建、不改收件人。DNS 与页面配置验收不能代替真实邮件收信测试；未经用户要求不发送测试邮件。

发布 `apiBase` 前必须验证公网 HTTPS、匿名受保护接口 401、文档/机器人路径 404、精确来源 CORS 和生产 Cookie。上线状态与证据记录在 `docs/优化记录-2026-10.md`；不要根据隧道 `/ready` 提前打开账号入口。
