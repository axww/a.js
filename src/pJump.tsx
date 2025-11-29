import { Context } from "hono";
import { Config, DB } from "./core";

export async function pJump(a: Context) {
    const tid = parseInt(a.req.query('tid') ?? '0')
    const time = parseInt(a.req.query('time') ?? '0')
    if (tid <= 0 || !time) { return a.redirect('/') }
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = await DB.db
        .prepare(`
            SELECT COUNT(*) AS skip
            FROM post
            WHERE attr = 0 AND land = ? AND time <= ?
            ORDER BY attr ASC land ASC time ASC
        `) // 回复 attr 不可能是 1 置顶
        .get([-tid, time])
    const page = Math.ceil(data.skip / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + time, 301)
}
