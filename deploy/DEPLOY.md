# 部署手册（香港 VPS + Podman + nginx + club.qedlab.cn）

目标结构：`/srv/jikezhan/` 下按时间戳放多份发布，`current` 是指向当前版本的 symlink；
nginx 跑在 Podman 容器里（Quadlet 托管），只读挂载 `current`。发布 = 传新目录 + 换 symlink，秒级回滚。

## 0. DNS

在域名商处加 A 记录：`club.qedlab.cn → VPS 公网 IP`。等解析生效（`dig club.qedlab.cn` 确认）。

## 1. VPS 初始化（root）

```bash
dnf install -y podman rsync      # Debian/Ubuntu 换成 apt
mkdir -p /srv/jikezhan/{releases,certbot}
# 把仓库里的 deploy/nginx.bootstrap.conf 传上去
scp deploy/nginx.bootstrap.conf root@VPS:/srv/jikezhan/nginx.conf
```

## 2. 先用 HTTP-only 配置起 nginx（为了过 ACME 验证）

```bash
mkdir -p /etc/containers/systemd
scp deploy/jikezhan-site.container root@VPS:/etc/containers/systemd/
# 首次没有证书，nginx.conf 必须先是 bootstrap 版（只有 80 端口）
ssh root@VPS 'systemctl daemon-reload && systemctl start jikezhan-site'
curl -I http://club.qedlab.cn/    # 应返回 200
```

## 3. 申请证书（webroot 模式）

```bash
ssh root@VPS 'podman run --rm --network host \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /srv/jikezhan/certbot:/var/www/certbot \
  docker.io/certbot/certbot certonly --webroot \
  -w /var/www/certbot -d club.qedlab.cn --agree-tos -m 你的邮箱 --non-interactive'
```

成功后把完整配置换上去并重启：

```bash
scp deploy/nginx.conf root@VPS:/srv/jikezhan/nginx.conf
ssh root@VPS 'systemctl restart jikezhan-site'
curl -I https://club.qedlab.cn/   # 应返回 200
```

## 4. 证书自动续期

```bash
ssh root@VPS 'cat >/etc/systemd/system/certbot-renew.service <<EOF
[Unit]
Description=Certbot renew + nginx reload
[Service]
Type=oneshot
ExecStart=/usr/bin/podman run --rm --network host -v /etc/letsencrypt:/etc/letsencrypt -v /srv/jikezhan/certbot:/var/www/certbot docker.io/certbot/certbot renew --webroot -w /var/www/certbot --quiet
ExecStartPost=/usr/bin/podman exec jikezhan-site nginx -s reload
EOF
cat >/etc/systemd/system/certbot-renew.timer <<EOF
[Unit]
Description=Daily certbot renew
[Timer]
OnCalendar=daily
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload && systemctl enable --now certbot-renew.timer'
```

## 5. 日常发布（本地）

```bash
VPS=root@VPS_IP ./deploy/deploy.sh
```

脚本做四件事：本地构建 → rsync 到 `releases/<时间戳>` → `ln -sfn` 切换 `current` → 清理旧版本（默认保留 5 份）并 reload nginx。
回滚 = 在 VPS 上把 `current` 指回旧目录，再 reload。

## 6. 首次发布前检查

- `npm run docs:build` 本地零告警（KaTeX / 死链）
- `sitemap.xml`、`robots.txt` 在 dist 根目录（构建自动生成）
- 404 页面：访问一个不存在的地址，应看到「信号丢失」页
