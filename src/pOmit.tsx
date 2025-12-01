import { Context } from "hono";
import { Auth, DB } from "./core";

export async function pOmit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const pid = -parseInt(a.req.param('eid') ?? '0')
    // 被删的帖子
    const post = DB.prepare(`SELECT pid, user, land FROM post WHERE pid = ?` + ((i.grade < 2) ? `AND user = ?` : ``))
        .get(pid, i.uid) as any
    // 如果无权限或帖子不存在则报错
    if (!post) { return a.text('410:gone', 410) }
    if (post.land > 0) { // 如果删的是thread
        // 主题自身被删 类型改为3
        DB.prepare(`UPDATE post SET attr = 3 WHERE pid = ?`).run(post.pid);
        // 正常状态回复 类型改为1 隐藏Thread(tid=pid=-land)下所有回复
        DB.prepare(`UPDATE post SET attr = 1 WHERE attr = 0 AND land = ?`).run(-post.pid);
        // 扣除积分
        DB.prepare(`UPDATE user SET user SET golds = golds-2, credits = credits-2 WHERE uid = ?`).run(post.user)
    } else { // 如果删的是post
        // 主题自身被删 类型改为3
        DB.prepare(`UPDATE post SET attr = 3 WHERE pid = ?`).run(post.pid);
        // 修改话题时间 注意逻辑顺序 必须先标记删除 再获取最后回复
        DB.prepare(`
                WITH last AS (
                    SELECT pid, sort
                    FROM post
                    WHERE attr = 0 AND land = ?
                    ORDER BY attr DESC, land DESC, sort DESC
                    LIMIT 1
                )
                UPDATE post
                SET post.sort = MIN(COALESCE((SELECT last.sort FROM last),post.sort),post.sort)
                WHERE post.pid = ?
            `)
            .run([post.land, -post.land]) // post自身land本来就<0所以不用正负转换
        // 扣除积分
        DB.prepare(`UPDATE user SET user SET golds = golds-1, credits = credits-1 WHERE uid = ?`).run(post.user)
    }
    return a.text('ok')
}
