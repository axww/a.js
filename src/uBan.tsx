import { Context } from "hono";
import { Auth, DB } from "./core";

export async function uBan(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const uid = parseInt(a.req.param('uid') ?? '0')
    // 如果无法标记则报错
    if (!DB.prepare(`
            UPDATE user
            SET grade = CASE WHEN grade != -2 THEN -2 ELSE 0 END
            WHERE uid = ? AND grade < 1
        `) // 无权封禁贵宾以上用户组
        .run([uid])
        .changes) { return a.text('410:gone', 410) }
    // 删除违规者所有帖子 将所有回复设为隐藏
    DB.prepare(`
            WITH thread AS (
                SELECT pid AS tid
                FROM post
                WHERE attr IN (0,1) AND user = ? AND land > 0
            )
            UPDATE post
            SET attr = 1
            WHERE attr = 0
            AND land IN (SELECT -tid FROM thread)
            AND user != ?
        `) // 必须是thread(land>0) 回复land=-tid
        .run([uid, uid])
    // 隐藏完他人回复后 删除违规者所有帖子
    DB.prepare(`UPDATE post SET attr = 3 WHERE attr IN (0,1) AND user = ?`).run([uid])
    return a.text('ok')
}
