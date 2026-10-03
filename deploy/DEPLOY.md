# 部署手册（宝塔反代 + Docker 静态容器）

架构：

```
geekstk.com → 宝塔 nginx（TLS/证书，反代）
            → 127.0.0.1:8080 → Docker 容器 nginx:alpine（只读挂载 /srv/jikezhan）
```

发布目录结构（原子发布，秒级回滚）：

```
/srv/jikezhan/
├── nginx.conf            # 容器内 nginx 配置（deploy/nginx.container.conf 上传而来）
├── current -> releases/20261003-120000
└── releases/
    ├── 20261003-120000/  # 每次发布的 dist 内容
    └── 20261002-090000/
```

## 一次性初始化（已在本机执行过）

```bash
VPS=root@qedlab.cn SSHPASS=*** ./deploy/setup-server.sh
```

做三件事：建 `/srv/jikezhan/releases`、上传容器 nginx 配置、用 Docker 起 `jikezhan-site`
容器（`127.0.0.1:8080 -> 80`，`--restart=always`，只读挂载发布根）。

> 想免密发布：把本机 `~/.ssh/id_*.pub` 追加到服务器 `/root/.ssh/authorized_keys`，
> 之后 deploy.sh 不需要 `SSHPASS`。

## 日常发布

```bash
VPS=root@qedlab.cn SSHPASS=*** ./deploy/deploy.sh
```

流程：本地 `npm run docs:build` → rsync 到 `releases/<时间戳>` → 原子切 `current`
→ 清理旧版本（保留 5 份）→ `docker exec jikezhan-site nginx -s reload`。

## 回滚

服务器上把 `current` 指回旧目录即可（立即生效，无需 reload）：

```bash
cd /srv/jikezhan && ln -sfn releases/<旧时间戳> current
```

## 宝塔面板（站点 + 反向代理 + SSL）

1. **DNS**：`geekstk.com` A 记录 → `38.175.194.229`（必须先解析成功，否则证书申请会失败）
2. 宝塔 → 网站 → 添加站点：域名 `geekstk.com`，纯静态（不建数据库/PHP）
3. 站点设置 → 反向代理 → 添加反向代理：
   - 代理名称：`jikezhan`
   - 目标 URL：`http://127.0.0.1:8080`
   - 发送域名：`$host`（默认）
   - 其余保持默认，缓存关闭
4. 站点设置 → SSL → Let's Encrypt → 申请证书 → 开启强制 HTTPS

## 验收

```bash
# 服务器侧（容器直连）
curl -sI http://127.0.0.1:8080/ | head -1          # 200
curl -s http://127.0.0.1:8080/no-such | grep 信号    # 404 页

# 本机（走宝塔反代）
curl -sI https://geekstk.com/ | head -3
```
