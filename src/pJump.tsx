import { Context } from "hono";
import { Config, DB } from "./core";

export async function pJump(a: Context) {
    const tid = parseInt(a.req.query('tid') ?? '0')
    const sort = parseInt(a.req.query('sort') ?? '0')
    if (tid <= 0 || !sort) { return a.redirect('/') }
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const skip = (await DB.db
        .prepare(`
            SELECT COUNT(*) AS skip
            FROM post
            WHERE attr = 0 AND land = ? AND sort <= ?
            ORDER BY attr ASC, land ASC, sort ASC
        `) // 回复 attr 不可能是 1 置顶
        .get([-tid, sort])
    )?.skip ?? 0
    const page = Math.ceil(skip / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + sort, 301)
}
