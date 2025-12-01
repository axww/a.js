import { Context } from "hono";
import { Auth, DB } from "./core";

export async function uAdv(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const uid = parseInt(a.req.param('uid') ?? '0')
    // 如果无法标记则报错
    if (!DB.prepare(`
            UPDATE user
            SET grade = CASE WHEN grade != -1 THEN -1 ELSE 0 END
            WHERE uid = ? AND grade < 1
        `) // 无权封禁贵宾以上用户组
        .run([uid])
        .changes) { return a.text('410:gone', 410) }
    return a.text('ok')
}
