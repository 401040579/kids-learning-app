#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抓取白名单频道的全部 YouTube 视频，生成静态数据文件 data/videos.json。

【用途】
「探索视频」模块过去在浏览器里通过公共 CORS 代理拉 YouTube RSS，代理全部失效且
RSS 硬上限只有 15 条。现改为：本脚本在服务端（本地 / GitHub Actions）预生成
data/videos.json，前端同源 fetch('data/videos.json') 直接读取，无跨域、无代理、
无 API key，Service Worker 预缓存后可离线使用。

【怎么手动运行】
    cd /path/to/kids-learning-app
    python3 scripts/fetch_videos.py                 # 写入 data/videos.json
    python3 scripts/fetch_videos.py --out /tmp/a.json   # 写到别处（测试用）
    # 快速冒烟测试：只抓前 300 条。局部抓取的结果不完整，脚本会拒绝写正式文件，
    # 所以必须配合 --out 写到别处。
    python3 scripts/fetch_videos.py --max-pages 3 --out /tmp/smoke.json

只依赖 Python 3 标准库（urllib / json / re），GitHub Actions runner 无需 pip install。

【数据来源与原理】
频道的「上传」播放列表 ID = 频道 ID 把开头的 UC 换成 UU。
  1. GET https://www.youtube.com/playlist?list=UU{channelId[2:]}
     从 HTML 里正则抠出 ytInitialData（首屏 100 条 + 一个 continuation token），
     同时抠出 INNERTUBE_API_KEY 和 clientVersion。
  2. 后续页调 innertube 内部接口翻页：
     POST https://www.youtube.com/youtubei/v1/browse?key={INNERTUBE_API_KEY}
     直到没有 continuation token 为止。
  3. 视频条目在嵌套的 lockupViewModel 节点里：
     contentId = 11 位视频 ID，标题在
     metadata.lockupMetadataViewModel.title.content。

【重要：这依赖 YouTube 页面结构，随时可能失效】
YouTube 改版（换掉 ytInitialData / lockupViewModel / innertube 协议）或限流会让抓取
拿到 0 条或**只抓到一半**。后者更危险——静默截断会把好数据覆盖成半截还 exit 0。
为此脚本设了四道保护，任何一道触发都报错退出（返回码非 0）且**绝不覆盖已有文件**：
  1. 任何频道抓到 0 条 → 失败
  2. 某页解析出 0 条但 YouTube 仍给了续页 token（限流/改版的典型表现）→ 失败
  3. 撞到 MAX_PAGES 上限时续页 token 还在（说明没抓完）→ 失败
  4. 新列表比已有文件少 10% 以上（兜底，防上面识别不了的异常）→ 失败
全部频道都抓完并通过校验后，才一次性原子写入（写临时文件 + os.replace）。
真的失效时，去 YouTube 播放列表页看源码，重新确认下面几个常量/正则即可。
"""

import argparse
import gzip
import json
import os
import random
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ---------- 常量 ----------

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CONFIG = os.path.join(REPO_ROOT, 'js', 'videoWhitelistConfig.js')
DEFAULT_OUT = os.path.join(REPO_ROOT, 'data', 'videos.json')

# 安全上限：防止 continuation token 死循环
MAX_PAGES = 30            # 每个频道最多翻多少页（首页算第 1 页）
MAX_VIDEOS_PER_CHANNEL = 3000
PAGE_SLEEP = (0.5, 1.0)   # 每页之间随机 sleep 区间（秒），避免被限流
HTTP_TIMEOUT = 30
HTTP_RETRIES = 3

USER_AGENT = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
              'AppleWebKit/537.36 (KHTML, like Gecko) '
              'Chrome/126.0.0.0 Safari/537.36')

VIDEO_ID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
CHANNEL_ID_RE = re.compile(r'^UC[A-Za-z0-9_-]{22}$')
DURATION_RE = re.compile(r'^\d{1,3}:\d{2}(?::\d{2})?$')

# 这些是 YouTube 给不可用条目的占位标题，跳过
PLACEHOLDER_TITLES = {'private video', 'deleted video', '[private video]',
                      '[deleted video]', 'video unavailable'}


class FetchError(RuntimeError):
    """抓取/解析失败，调用方据此非 0 退出。"""


# ---------- 第 1 步：解析白名单配置 ----------

def strip_js_line_comments(src):
    """去掉 JS 的 // 行注释，但不动字符串里的内容（如 https:// 和注释里的示例）。

    简单状态机：跟踪当前是否在 '...' / "..." / `...` 字符串里，只有在字符串外
    遇到 // 才把该行剩余部分丢掉。避免家长把整个频道对象注释掉后仍被解析出来。
    """
    out = []
    quote = None
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if quote:
            out.append(ch)
            if ch == '\\' and i + 1 < n:      # 转义字符整体跳过
                out.append(src[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':   # 丢弃到行尾
                i += 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def extract_bracket_block(src, start_idx, open_ch='[', close_ch=']'):
    """从 start_idx 处的开括号开始，返回配对的括号内部内容（不含括号本身）。"""
    depth = 0
    for i in range(start_idx, len(src)):
        if src[i] == open_ch:
            depth += 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return src[start_idx + 1:i]
    raise FetchError('配置文件里 channels 数组的括号没有闭合')


def parse_whitelist_channels(config_path):
    """从 js/videoWhitelistConfig.js 里解析出 [{channelId, name}, ...]。

    配置文件是 JS 不是 JSON，用正则提取。这是频道的单一数据源，
    解析不出任何频道就直接报错，绝不静默产出空文件。
    """
    if not os.path.isfile(config_path):
        raise FetchError('找不到白名单配置文件: %s' % config_path)

    with open(config_path, 'r', encoding='utf-8') as f:
        src = strip_js_line_comments(f.read())

    m = re.search(r'channels\s*:\s*\[', src)
    if not m:
        raise FetchError('配置文件里没找到 channels: [ ... ]，格式可能变了: %s' % config_path)

    block = extract_bracket_block(src, m.end() - 1)

    channels = []
    seen = set()
    for obj_m in re.finditer(r'\{[^{}]*\}', block, re.S):
        obj = obj_m.group(0)
        cid_m = re.search(r'channelId\s*:\s*(["\'])(.*?)\1', obj, re.S)
        if not cid_m:
            continue
        channel_id = cid_m.group(2).strip()
        if not CHANNEL_ID_RE.match(channel_id):
            raise FetchError('channelId 格式不合法（应为 UC 开头 24 位）: %r' % channel_id)
        if channel_id in seen:
            continue
        seen.add(channel_id)
        name_m = re.search(r'name\s*:\s*(["\'])(.*?)\1', obj, re.S)
        channels.append({
            'channelId': channel_id,
            'name': name_m.group(2).strip() if name_m else channel_id,
        })

    if not channels:
        raise FetchError('配置文件里 channels 为空，没有可抓取的频道: %s' % config_path)
    return channels


# ---------- 第 2 步：HTTP ----------

def _read_response(resp):
    raw = resp.read()
    if resp.headers.get('Content-Encoding', '').lower() == 'gzip':
        raw = gzip.decompress(raw)
    return raw.decode('utf-8', errors='replace')


def http_request(url, data=None, headers=None, label=''):
    """带重试的 HTTP 请求，返回响应文本。失败抛 FetchError。"""
    base_headers = {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip',
        # 绕开欧盟 Cookie 同意页跳转，否则拿到的是 consent.youtube.com 的 HTML
        'Cookie': 'SOCS=CAI; CONSENT=YES+cb',
    }
    if headers:
        base_headers.update(headers)

    last_err = None
    for attempt in range(1, HTTP_RETRIES + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=base_headers)
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return _read_response(resp)
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            last_err = e
            if attempt < HTTP_RETRIES:
                wait = 2 ** attempt
                print('  [warn] %s 请求失败(%s/%s): %s，%ss 后重试'
                      % (label or url, attempt, HTTP_RETRIES, e, wait), file=sys.stderr)
                time.sleep(wait)
    raise FetchError('请求失败 %s: %s' % (label or url, last_err))


# ---------- 第 3 步：从 JSON 里挖视频条目 ----------

def iter_nodes(node, key):
    """深度优先遍历，按出现顺序 yield 所有 node[key]（保持频道上传顺序）。"""
    if isinstance(node, dict):
        for k, v in node.items():
            if k == key:
                yield v
            yield from iter_nodes(v, key)
    elif isinstance(node, list):
        for item in node:
            yield from iter_nodes(item, key)


def find_first(node, key):
    for v in iter_nodes(node, key):
        return v
    return None


def extract_duration(lockup):
    """尽力从 lockupViewModel 里取时长文本（如 "12:34"），取不到返回 None。"""
    for badge in iter_nodes(lockup, 'thumbnailBadgeViewModel'):
        if isinstance(badge, dict):
            text = badge.get('text')
            if isinstance(text, str) and DURATION_RE.match(text.strip()):
                return text.strip()
    return None


def extract_videos(payload):
    """从 ytInitialData / innertube 响应里抠出 [{id, title, duration?}, ...]。"""
    videos = []
    for lockup in iter_nodes(payload, 'lockupViewModel'):
        if not isinstance(lockup, dict):
            continue
        video_id = lockup.get('contentId')
        if not isinstance(video_id, str) or not VIDEO_ID_RE.match(video_id):
            continue
        title = None
        meta = lockup.get('metadata')
        if isinstance(meta, dict):
            title_node = find_first(meta, 'title')
            if isinstance(title_node, dict):
                title = title_node.get('content')
            elif isinstance(title_node, str):
                title = title_node
        if not isinstance(title, str) or not title.strip():
            continue
        title = title.strip()
        if title.lower() in PLACEHOLDER_TITLES:
            continue
        item = {'id': video_id, 'title': title}
        duration = extract_duration(lockup)
        if duration:
            item['duration'] = duration
        videos.append(item)
    return videos


def extract_continuation(payload):
    """取下一页的 continuation token，没有则返回 None（说明已经翻到底）。"""
    for cmd in iter_nodes(payload, 'continuationCommand'):
        if isinstance(cmd, dict):
            token = cmd.get('token')
            if isinstance(token, str) and token:
                return token
    return None


# ---------- 第 4 步：抓取单个频道 ----------

def fetch_first_page(channel_id):
    """抓播放列表首页，返回 (ytInitialData, innertube_api_key, client_version)。"""
    playlist_id = 'UU' + channel_id[2:]
    url = 'https://www.youtube.com/playlist?list=%s&hl=en' % playlist_id
    html = http_request(url, label='playlist %s' % playlist_id)

    m = re.search(r'ytInitialData\s*=\s*(\{.*?\})\s*;\s*</script>', html, re.S)
    if not m:
        m = re.search(r'ytInitialData"\]\s*=\s*(\{.*?\})\s*;\s*</script>', html, re.S)
    if not m:
        raise FetchError('页面里没找到 ytInitialData，YouTube 结构可能变了 (%s)' % url)
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise FetchError('ytInitialData 解析失败 (%s): %s' % (url, e))

    key_m = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html)
    ver_m = re.search(r'"clientVersion":"([\d.]+)"', html)
    api_key = key_m.group(1) if key_m else None
    client_version = ver_m.group(1) if ver_m else '2.20240101.00.00'
    return data, api_key, client_version


def fetch_continuation_page(token, api_key, client_version):
    """用 innertube 内部接口抓下一页。"""
    url = 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false'
    if api_key:
        url += '&key=' + api_key
    body = json.dumps({
        'context': {'client': {'clientName': 'WEB', 'clientVersion': client_version,
                               'hl': 'en', 'gl': 'US'}},
        'continuation': token,
    }).encode('utf-8')
    text = http_request(url, data=body, headers={
        'Content-Type': 'application/json',
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': client_version,
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/',
    }, label='innertube browse')
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise FetchError('innertube 响应不是合法 JSON: %s' % e)


def fetch_channel_videos(channel_id, name, max_pages=MAX_PAGES):
    """抓取一个频道的全部视频，返回按上传顺序（新→旧）去重后的列表。"""
    print('==> 抓取频道 %s (%s)' % (name, channel_id))
    videos = []
    seen = set()

    def absorb(page_videos):
        added = 0
        for v in page_videos:
            if v['id'] in seen:
                continue
            seen.add(v['id'])
            videos.append(v)
            added += 1
        return added

    data, api_key, client_version = fetch_first_page(channel_id)
    added = absorb(extract_videos(data))
    token = extract_continuation(data)
    print('    第 1 页: +%d 条（累计 %d）%s'
          % (added, len(videos), '' if token else ' [无续页]'))

    page = 1
    while token and page < max_pages and len(videos) < MAX_VIDEOS_PER_CHANNEL:
        time.sleep(random.uniform(*PAGE_SLEEP))
        page += 1
        payload = fetch_continuation_page(token, api_key, client_version)
        page_videos = extract_videos(payload)
        added = absorb(page_videos)
        token = extract_continuation(payload)
        print('    第 %d 页: +%d 条（累计 %d）%s'
              % (page, added, len(videos), '' if token else ' [到底了]'))
        # 一页什么都没解析出来，但 YouTube 还给了续页 token —— 说明它「认为还有更多」
        # 而我们解析不出来（限流软失败、bot 拦截页、只改了续页结构的改版）。
        # 这必须硬失败：如果只是 break，就会带着残缺列表 exit 0，把好数据覆盖成半截，
        # CI 全程绿灯还会 bump SW 版本把截断结果推给所有设备。
        if not page_videos:
            raise FetchError(
                '频道 %s (%s) 第 %d 页解析出 0 条视频，但 YouTube 仍返回了续页 token，'
                '说明抓取被限流或页面结构已变化（此时已抓到 %d 条，很可能不完整）。'
                '为保护已有数据，不写入输出文件。'
                % (name, channel_id, page, len(videos)))

    # 撞到页数上限但 token 还在 = 列表没抓完。同样不能当成正常结束，
    # 否则会静默少抓。（--max-pages 的冒烟测试走 partial 模式，见 main()）
    if token and page >= max_pages:
        raise FetchError(
            '频道 %s (%s) 达到最大页数上限 %d 时仍有续页 token，列表未抓完'
            '（已抓 %d 条）。如果这个频道确实超过 %d 页，请调大脚本里的 MAX_PAGES；'
            '如果是想做局部冒烟测试，请配合 --out 写到别处。'
            % (name, channel_id, max_pages, len(videos), max_pages))

    if not videos:
        raise FetchError(
            '频道 %s (%s) 抓到 0 条视频。可能是频道 ID 写错、频道无公开视频，'
            '或 YouTube 页面结构已变化。为保护已有数据，不写入输出文件。'
            % (name, channel_id))
    return videos[:MAX_VIDEOS_PER_CHANNEL]


def load_previous_channels(out_path):
    """读已有输出文件里的 channels，读不到就返回空 dict（首次生成/文件损坏）。"""
    try:
        with open(out_path, encoding='utf-8') as f:
            channels = json.load(f).get('channels')
        return channels if isinstance(channels, dict) else {}
    except Exception:
        return {}


def guard_against_shrink(out_path, result_channels, tolerance=0.9):
    """写盘前跟已有文件比一次数量，暴跌就拒绝覆盖。

    上面的翻页保护挡的是「能识别的失败」，这里挡的是「识别不了的失败」——
    只要新列表比上次少了一成以上，就当作抓取异常处理。宁可 CI 红一次让人来看，
    也不能把孩子的视频从 435 条悄悄变成 300 条。
    """
    try:
        with open(out_path, encoding='utf-8') as f:
            old_channels = json.load(f).get('channels') or {}
    except Exception:
        return  # 文件不存在／损坏／首次生成，没有可比基准

    for channel_id, ch in result_channels.items():
        old = old_channels.get(channel_id)
        if not isinstance(old, dict):
            continue
        old_videos = old.get('videos')
        if not isinstance(old_videos, list) or not old_videos:
            continue
        old_n, new_n = len(old_videos), len(ch['videos'])
        if new_n < old_n * tolerance:
            raise FetchError(
                '频道 %s 的视频数从 %d 跌到 %d（低于 %d%% 阈值），疑似抓取不完整，'
                '拒绝覆盖已有数据。确认频道确实删了视频的话，'
                '手动删掉 data/videos.json 里该频道再重跑。'
                % (channel_id, old_n, new_n, int(tolerance * 100)))


# ---------- 第 5 步：校验与原子写入 ----------

def validate_payload(payload):
    """写盘前最后一道校验，任何异常都抛 FetchError。"""
    channels = payload.get('channels')
    if not isinstance(channels, dict) or not channels:
        raise FetchError('校验失败：channels 为空')
    for channel_id, ch in channels.items():
        if not CHANNEL_ID_RE.match(channel_id):
            raise FetchError('校验失败：非法 channelId %r' % channel_id)
        videos = ch.get('videos')
        if not isinstance(videos, list) or not videos:
            raise FetchError('校验失败：频道 %s 没有视频' % channel_id)
        if ch.get('videoCount') != len(videos):
            raise FetchError('校验失败：频道 %s videoCount 与实际条数不一致' % channel_id)
        ids = set()
        for v in videos:
            vid = v.get('id')
            if not isinstance(vid, str) or not VIDEO_ID_RE.match(vid):
                raise FetchError('校验失败：非法 videoId %r' % vid)
            if vid in ids:
                raise FetchError('校验失败：频道 %s 有重复视频 id %s' % (channel_id, vid))
            ids.add(vid)
            if not isinstance(v.get('title'), str) or not v['title'].strip():
                raise FetchError('校验失败：视频 %s 标题为空' % vid)


def atomic_write_json(path, payload):
    """先写同目录临时文件再 os.replace，保证要么旧文件完好要么新文件完整。"""
    out_dir = os.path.dirname(os.path.abspath(path)) or '.'
    os.makedirs(out_dir, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
    fd, tmp_path = tempfile.mkstemp(dir=out_dir, prefix='.videos-', suffix='.json.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        # mkstemp 默认 0600，但这是要被 Web 服务器读取的静态资源，放宽到常规 0644
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


# ---------- 主流程 ----------

def main(argv=None):
    parser = argparse.ArgumentParser(
        description='抓取白名单频道的全部 YouTube 视频，生成 data/videos.json')
    parser.add_argument('--out', default=DEFAULT_OUT,
                        help='输出路径（默认 data/videos.json）')
    parser.add_argument('--config', default=DEFAULT_CONFIG,
                        help='白名单配置路径（默认 js/videoWhitelistConfig.js）')
    parser.add_argument('--max-pages', type=int, default=MAX_PAGES,
                        help='每个频道最多翻页数（默认 %d）' % MAX_PAGES)
    args = parser.parse_args(argv)

    # --max-pages 调小 = 故意只抓一部分（冒烟测试）。这种残缺结果绝不能落到
    # 正式的 data/videos.json 上，否则一次「快速测试」就把线上列表截断了。
    if args.max_pages < MAX_PAGES and os.path.abspath(args.out) == os.path.abspath(DEFAULT_OUT):
        print('❌ --max-pages 小于 %d 属于局部抓取，结果不完整，'
              '不允许写入正式文件 %s。请加 --out /tmp/xxx.json 写到别处。'
              % (MAX_PAGES, DEFAULT_OUT), file=sys.stderr)
        return 2

    try:
        channels = parse_whitelist_channels(args.config)
        print('从配置解析到 %d 个频道' % len(channels))

        # 关键：先把所有频道抓完并在内存里校验，最后一次性原子写入。
        # 中途任何失败都直接退出，绝不覆盖已有的 data/videos.json。
        previous = load_previous_channels(args.out)
        result_channels = {}
        degraded = []
        for ch in channels:
            cid = ch['channelId']
            try:
                videos = fetch_channel_videos(cid, ch['name'], args.max_pages)
                result_channels[cid] = {
                    'name': ch['name'],
                    'videoCount': len(videos),
                    'videos': videos,
                }
            except FetchError as e:
                # 单个频道抓失败时，沿用它上一次的数据继续，别让一个坏频道
                # 把其他健康频道的更新也永久冻结。没有历史数据可沿用才真的失败。
                old = previous.get(cid)
                if not (isinstance(old, dict) and old.get('videos')):
                    raise
                print('    [warn] %s 抓取失败，沿用上次的 %d 条：%s'
                      % (ch['name'], len(old['videos']), e), file=sys.stderr)
                result_channels[cid] = {
                    'name': ch['name'],
                    'videoCount': len(old['videos']),
                    'videos': old['videos'],
                }
                degraded.append('%s（%s）：%s' % (ch['name'], cid, e))

        if degraded and len(degraded) == len(channels):
            raise FetchError('全部 %d 个频道都抓取失败，不写入输出文件。' % len(channels))

        for msg in degraded:
            # GitHub Actions 的 ::warning:: 注解会在 Actions 页面高亮显示，
            # 既不让整个 job 红掉阻塞健康频道，又不会被静默忽略。
            print('::warning title=频道抓取失败，已沿用旧数据::%s' % msg)

        payload = {
            'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'channels': result_channels,
        }
        validate_payload(payload)
        guard_against_shrink(args.out, result_channels)
        atomic_write_json(args.out, payload)

        total = sum(c['videoCount'] for c in result_channels.values())
        print('✅ 已写入 %s（%d 个频道，共 %d 个视频）' % (args.out, len(result_channels), total))
        return 0
    except FetchError as e:
        print('❌ 抓取失败：%s' % e, file=sys.stderr)
        print('   已有的输出文件保持不变。', file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('\n已中断，输出文件未改动。', file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())
