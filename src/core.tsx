import { Context } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import Database from "libsql";
import sanitizeHtml from 'sanitize-html';

export const DB = new Database("www.db");

export class Maps {
    // 存储 map 的内存容器
    private static maps: Map<string, Map<any, any>> = new Map();
    // 创建一个新的 map，并保存到静态存储中
    static set<K, V>(name: string, entries?: [K, V][]): Map<K, V> {
        const map = new Map<K, V>(entries);
        this.maps.set(name, map);
        return map;
    }
    // 取出指定名称的 map 如果不存在则自动创建一个新的 map
    static get<K, V>(name: string): Map<K, V> {
        if (!this.maps.has(name)) {
            this.set<K, V>(name);
        }
        return this.maps.get(name) as Map<K, V>;
    }
    // 删除一个 map
    static del(name: string): boolean {
        return this.maps.delete(name);
    }
    // 列出所有 map 的名字
    static all(): string[] {
        return Array.from(this.maps.keys());
    }
}

export class Config {
    private static data = Maps.get<string, any>('Config');
    private static void = true;
    static async init(a: Context) {
        const configs = DB.prepare(`SELECT * FROM conf`).all() as any;
        configs.forEach(({ key, value }: { key: string; value: string }) => {
            try {
                this.data.set(key, value ? JSON.parse(value) : null);
                this.void = false;
            } catch (error) {
                console.error(`Failed to parse config ${key}:`, error);
            }
        });
    }
    static async get<T>(a: Context, key: string, match: boolean | undefined = undefined): Promise<T> {
        if (this.void) { await this.init(a); }
        // match = true 匹配域名配置 如果未找到 返回undefined
        // match = false 匹配域名配置 如果未找到 继续查找默认值
        let conf = (match === undefined ? undefined : this.data.get(a.get('hostname') + '.' + key));
        if (!match && conf === undefined) { conf = this.data.get(key); }
        return conf as T;
    }
    static async set(a: Context, key: string, value: any) {
        if (this.void) { await this.init(a); }
        try {
            DB.prepare(`INSERT INTO conf (?) VALUES (?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`)
                .run([key, value])
            this.data.set(key, value)
        } catch (error) {
            console.error(`Failed to set config ${key}:`, error)
        }
    }
}

export async function Auth(a: Context) {
    const jwt = getCookie(a, 'JWT');
    if (!jwt) { return undefined }
    let auth = await verify(jwt, await Config.get<string>(a, 'secret_key')) as { uid: number }
    if (!auth.uid) { return undefined }
    const user = DB.prepare(`
            SELECT *,
                COALESCE((
                    SELECT p.sort 
                    FROM post p
                    WHERE p.attr = 0 AND p.call = u.uid
                    ORDER BY p.attr DESC, p.call DESC, p.sort DESC
                    LIMIT 1
                ), 0) last_call
            FROM user u
            WHERE u.uid = ?
        `)
        .get([auth.uid, auth.uid]) as any
    if (!user) { return undefined }
    const { hash, salt, ...i } = user // 把密码从返回数据中抹除
    return i
}

export function Pagination(perPage: number, sum: number, page: number, near: number) {
    if (!page) { page = 1 }
    // 首页
    const navigation = [1]
    const maxPage = Math.floor((sum + perPage - 1) / perPage)
    if (page <= 1 + near) {
        // 首页邻页
        const edge = 1 + near * 2
        for (let p = 2; p <= edge && p < maxPage; p++) {
            navigation.push(p)
        }
        if (edge < maxPage - 1) {
            navigation.push(0)
        }
    } else if (page >= maxPage - near) {
        // 尾页邻页
        const edge = maxPage - near * 2
        if (edge > 2) {
            navigation.push(0)
        }
        for (let p = edge; p < maxPage; p++) {
            if (p > 1) {
                navigation.push(p)
            }
        }
    } else {
        // 非首尾页
        if (page - near > 2) {
            navigation.push(0)
        }
        for (let p = page - near; p <= page + near; p++) {
            navigation.push(p)
        }
        if (page + near < maxPage - 1) {
            navigation.push(0)
        }
    }
    // 尾页
    if (maxPage > 1) {
        navigation.push(maxPage)
    }
    return navigation
}

export function HTMLFilter(html: string | null | undefined) {
    if (!html) { return ''; }
    return sanitizeHtml(html, {
        allowedTags: [
            'a', 'b', 'i', 'u', 'font', 'strong', 'em', 'strike', 'span',
            'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption',
            'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'menu', 'multicol',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'p', 'div', 'pre', 'br',
            'img', 'video', 'audio', 'code', 'blockquote', 'iframe', 'section'
        ],
        allowedAttributes: {
            'a': ['href', 'target'],
            'img': ['src', 'alt', 'width', 'height'],
        }
    });
}

export async function HTMLText(html: string | null | undefined, len = 0, first = false) {
    if (!html) { return ''; }
    let temp = '';
    let exec = true;
    sanitizeHtml(html, {
        onCloseTag: (tagName) => {
            // 如果提取首行则返回已积累内容
            if (first && temp && ['p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                exec = false;
            }
        },
        textFilter: (text) => {
            if (exec) {
                temp += text
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, " ")
                    .trim()
                // 之前读取到行时加入空格分隔
                if (temp) {
                    temp += ' ';
                }
                // 字符串大于指定长度则停止
                if (temp.length >= len) {
                    if (temp.length > len) {
                        temp = temp.slice(0, len - 3) + '...';
                    }
                    exec = false;
                }
            }
            return '';
        }
    });
    return temp
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#39;")
        .trim()
        || '...'
}

export function URLQuery(a: Context, newParams: { [key: string]: string }) {
    const allow = ['page', 'user', 'land'];
    const oldParams = a.req.query();
    const query = new URLSearchParams();
    for (let key of allow) {
        // 优先使用新参数覆盖老参数
        if (key in newParams) {
            // 增加或覆盖参数
            if (newParams[key]) {
                query.append(key, newParams[key]);
            }
            // 参数被删除（传入空白字符串）
            continue;
        }
        // 新参数没有时再继承老参数
        if (key in oldParams) {
            query.append(key, oldParams[key]);
        }
    }
    return query.size ? '?' + query.toString() : '';
}

export function RandomString(length: number = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 仅限 A-Z 和 0-9
    let result = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]; // 确保字符范围只在 chars 内
    }
    return result;
}

export function MD5(input: string | ArrayBuffer | Uint8Array): string {
    function toUint8(data: typeof input): Uint8Array {
        if (typeof data === "string") return new TextEncoder().encode(data);
        if (data instanceof Uint8Array) return data;
        return new Uint8Array(data);
    }
    function toHex(bytes: Uint8Array): string {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    function leftRotate(x: number, c: number): number {
        return (x << c) | (x >>> (32 - c));
    }
    const bytes = toUint8(input);
    const origLen = bytes.length;
    const bitLen = origLen * 8;
    const padLen = ((56 - ((origLen + 1) % 64)) + 64) % 64;
    const totalLen = origLen + 1 + padLen + 8;
    const buffer = new Uint8Array(totalLen);
    buffer.set(bytes, 0);
    buffer[origLen] = 0x80;
    const view = new DataView(buffer.buffer);
    view.setUint32(totalLen - 8, bitLen >>> 0, true);
    view.setUint32(totalLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);
    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
    const s = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];
    const K = new Uint32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    for (let i = 0; i < buffer.length; i += 64) {
        const M = new Uint32Array(16);
        for (let j = 0; j < 16; j++) M[j] = view.getUint32(i + j * 4, true);
        let A = a, B = b, C = c, D = d;
        for (let j = 0; j < 64; j++) {
            let F: number, g: number;
            if (j < 16) { F = (B & C) | (~B & D); g = j; }
            else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
            else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * j) % 16; }
            const tmp = D;
            const sum = (A + F + K[j] + M[g]) >>> 0;
            D = C; C = B; B = (B + leftRotate(sum, s[j])) >>> 0; A = tmp;
        }
        a = (a + A) >>> 0; b = (b + B) >>> 0; c = (c + C) >>> 0; d = (d + D) >>> 0;
    }
    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    outView.setUint32(0, a, true);
    outView.setUint32(4, b, true);
    outView.setUint32(8, c, true);
    outView.setUint32(12, d, true);
    return toHex(out);
}
