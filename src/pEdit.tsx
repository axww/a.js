import { Context } from "hono";
import { raw } from "hono/html";
import { Auth, DB } from "./core";
import { PEdit } from "../render/PEdit";

export async function pEdit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    if (i.grade <= -2) { return a.text('403', 403) } // 禁言用户
    const eid = parseInt(a.req.param('eid') ?? '0')
    let land = 0
    let title = ""
    let content = ""
    if (eid < 0) {
        title = "编辑"
        const post = await DB.db
            .prepare(`
                SELECT *
                FROM post
                WHERE pid = ?
                AND attr IN (0,1)
                `+ ((i.grade >= 3) ? `` : `AND user = ? AND time + 604800 > ?`)
            )
            .get(-eid, i.uid, a.get('time'))
        if (!post) { return a.text('403', 403) }
        land = post.land;
        content = raw(post.content) ?? '';
    } else if (eid > 0) {
        title = "回复"
        land = -1;
    } else {
        title = "发帖"
    }
    const thread_lock = true;
    return a.html(PEdit(a, { i, title, eid, land, content, thread_lock }));
}
