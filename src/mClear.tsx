import { Context } from "hono";
import { DB, Auth } from "./core";

// 清空消息
export async function mClear(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    try {
        DB.prepare(`UPDATE user SET last_read = ? WHERE uid = ?`)
            .run([a.get('time'), i.uid])
    } catch (error) {
        console.error('切换失败:', error);
    }
    return a.json('ok')
}
