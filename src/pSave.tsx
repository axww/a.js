import { Context } from "hono";
import { Auth, DB, HTMLFilter } from "./core";

export async function pSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    if (i.grade <= -2) { return a.text('403', 403) } // 禁言用户
    const eid = parseInt(a.req.param('eid') ?? '0')
    const body = await a.req.formData()
    const land = parseInt(body.get('land')?.toString() ?? '0')
    if (![1, 2].includes(land)) { return a.text('illegal_land', 403) } // 是否在可选分区内
    const raw = body.get('content')?.toString() ?? ''
    if (eid < 0) { // 编辑
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        if (!DB.prepare(`
                UPDATE post
                SET land = CASE WHEN land > 0 THEN ? ELSE land END, content = ?
                WHERE pid = ? AND attr IN (0,1)
                `+ ((i.grade < 2) ? `AND user = ? AND sort + 604800 > ?` : ``)
        )  // 回帖不能修改分区 已删除不能编辑 站长和作者都能编辑 7天后禁止编辑
            .run([land, content, -eid, i.uid, a.get('time')])
            .changes) { return a.text('403', 403) }
        return a.text('ok')
    } else if (eid > 0) { // 回复
        if (a.get('time') - i.last_post < 30) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.grade == -1 && a.get('time') - i.last_post < 172800) { return a.text('ad_limit_2day', 403) } // 广告用户
        // 找到被引用帖子
        const quote = DB.prepare(`
                SELECT
                    post.pid AS pid,
                    post.user AS uid,
                    thread.pid AS tid,
                    thread.land AS thread_land,
                    thread.sort AS thread_sort
                FROM post
                LEFT JOIN post AS thread
                    ON thread.pid = CASE WHEN post.land > 0 THEN post.pid ELSE -post.land END
                WHERE post.pid = ? AND post.attr IN (0,1)
            `) // 已删除的内容不能回复
            .get([eid]) as any
        if (!quote || quote.pid === null) { return a.text('not_found', 403) } // 被回复帖子或主题不存在
        if ([1, 2].includes(quote.thread_land) && a.get('time') > quote.thread_sort + 604800) { return a.text('too_old', 429) } // 无热度7天后关闭
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const pid = (DB.prepare(`INSERT INTO post (user,call,land,sort,cite,content) VALUES (?,?,?,?,?,?)`)
            .run([i.uid, (i.uid == quote.uid) ? -quote.uid : quote.uid, -quote.tid, a.get('time'), quote.pid, content])
        ).lastInsertRowid // 如果回复的是自己则隐藏(-quote.uid)
        // 无法发表则报错
        if (!pid) { return a.text('db execute failed', 403) }
        // 回复后顶贴 可奖励积分
        if ([1].includes(quote.thread_land)) {
            DB.prepare(`UPDATE post SET sort = ? WHERE pid = ?`)
                .run([a.get('time'), quote.tid])
            DB.prepare(`UPDATE user SET golds = golds+1, credits = credits+1, last_post = ? WHERE uid = ?`)
                .run([a.get('time'), i.uid])
        }
        return a.text(String(pid))
    } else { // 发帖
        if (a.get('time') - i.last_post < 30) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.grade == -1 && a.get('time') - i.last_post < 604800) { return a.text('ad_limit_7day', 403) } // 广告用户
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const pid = DB.prepare(`INSERT INTO post (user,land,sort,cite,content) VALUES (?,?,?,?,?)`)
            .run([i.uid, land, a.get('time'), a.get('time'), content])
            .lastInsertRowid
        // 无法发表则报错
        if (!pid) { return a.text('db execute failed', 403) }
        // 奖励积分
        DB.prepare(`UPDATE user SET golds = golds+2, credits = credits+2, last_post = ? WHERE uid = ?`)
            .run([a.get('time'), i.uid])
        return a.text(String(pid))
    }
}
