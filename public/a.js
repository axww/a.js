// 发表帖子
async function post(eid, reload = false) {
    const data = new FormData();
    data.set('land', document.getElementsByName("land").length ? (document.querySelector('input[name="land"]:checked')?.value ?? 0) : 1); // 没有分区选项时添加默认值跳过拦截器
    data.set('content', quill.getSemanticHTML());
    const result = await fetch(new Request('/e/' + eid, { method: 'POST', body: data }))
    if (result.ok) {
        if (reload) {
            window.location.reload()
        } else {
            window.location = document.referrer
        }
    } else {
        let errorMsg = await result.text();
        switch (errorMsg) {
            case 'too_old': errorMsg = '帖子太旧已无法回复'; break;
            case 'too_fast': errorMsg = '太快了🥵请稍后再试'; break;
            case 'not_found': errorMsg = '被回复帖子不存在'; break;
            case 'illegal_land': errorMsg = '请选择合适的分区'; break;
            case 'content_short': errorMsg = '太短了😏请增加内容'; break;
            case 'ad_limit_2day': errorMsg = '2天可回复一次广告'; break;
            case 'ad_limit_7day': errorMsg = '7天可发表一次广告'; break;
        }
        // 创建一个简单的错误提示
        const alert = document.createElement('div');
        alert.style.position = 'fixed';
        alert.style.top = '50%';
        alert.style.left = '50%';
        alert.style.transform = 'translate(-50%, -50%)';
        alert.style.backgroundColor = 'white';
        alert.style.padding = '20px';
        alert.style.borderRadius = '8px';
        alert.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        alert.style.zIndex = '9999';
        alert.style.maxWidth = '400px';
        alert.style.width = '90%';
        alert.style.textAlign = 'center';

        alert.innerHTML = `
            <div style="margin-bottom: 15px; color: #e11d48; font-weight: bold; font-size: 18px;">
                <span>提交失败</span>
            </div>
            <div style="margin-bottom: 20px;">
                ${errorMsg}
            </div>
            <button style="background-color: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                确定
            </button>
        `;

        document.body.appendChild(alert);

        // 添加背景遮罩
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9998';
        document.body.appendChild(overlay);

        // 添加关闭事件
        const closeAlert = () => {
            alert.remove();
            overlay.remove();
        };

        alert.querySelector('button').addEventListener('click', closeAlert);
        overlay.addEventListener('click', closeAlert);

        // 3秒后自动关闭
        setTimeout(closeAlert, 3000);
    }
};

// 删除帖子
async function omit(eid) {
    if (!confirm('真的要删除吗?')) { return; }
    const result = await fetch(new Request('/e/' + eid, { method: 'DELETE' }))
    if (result.ok) {
        location.reload();
    } else {
        const errorMsg = await result.text();
        const toast = document.createElement('div');
        toast.className = 'toast toast-top toast-center';
        toast.style.marginTop = '4rem'; // 添加上边距，避免被导航栏遮挡
        toast.innerHTML = `
            < div class="alert alert-error" >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>删除失败：${errorMsg}</span>
            </div >
            `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// 置顶帖子
async function pin(tid) {
    try {
        const response = await fetch('/t/' + tid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('置顶操作失败');
        }
    } catch (error) {
        console.error('置顶请求出错:', error);
        alert('置顶操作失败');
    }
}

// 标记广告账号
async function adv(uid) {
    try {
        const response = await fetch('/uAdv/' + uid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('标记广告失败');
        }
    } catch (error) {
        console.error('标记广告出错:', error);
        alert('标记广告失败');
    }
}

// 封禁违规账号
async function ban(uid) {
    if (!confirm('封禁会删除所有帖子？')) { return }
    try {
        const response = await fetch('/uBan/' + uid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('封禁账号失败');
        }
    } catch (error) {
        console.error('封禁账号出错:', error);
        alert('封禁账号失败');
    }
}

// 上传文件
function upload() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (file) {
            var formData = new FormData();
            formData.append('fileToUpload', file);
            formData.append('reqtype', 'fileupload');
            formData.append('userhash', '');
            // 上传 CatBox
            fetch('/f', {
                method: 'POST',
                body: file
            })
                .then(async response => {
                    if (!response.ok) {
                        throw new Error('[' + response.status + '] ' + await response.text());
                    }
                    return await response.text();
                })
                .then(fid => {
                    if (!fid) { return false; }
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', 'https://i0.wp.com/files.catbox.moe/' + fid + '?ssl=1&w=1920');
                    quill.setSelection(range.index + 1);
                })
                .catch(error => {
                    alert('上传失败: ' + error);
                });
        }
    };
}

// 祖传大坨MD5
function md5(r) {
    function n(r, n) {
        var t = (65535 & r) + (65535 & n);
        return (r >> 16) + (n >> 16) + (t >> 16) << 16 | 65535 & t
    }
    function t(r, t, u, e, a, c) {
        var f = n(n(t, r), n(e, c));
        return n(f << a | f >>> 32 - a, u)
    }
    function u(r, n, u, e, a, c, f) {
        return t(n & u | ~n & e, r, n, a, c, f)
    }
    function e(r, n, u, e, a, c, f) {
        return t(n & e | u & ~e, r, n, a, c, f)
    }
    function a(r, n, u, e, a, c, f) {
        return t(n ^ u ^ e, r, n, a, c, f)
    }
    function c(r, n, u, e, a, c, f) {
        return t(u ^ (n | ~e), r, n, a, c, f)
    }
    for (var f = Array(), o = 8 * r.length, i = 1732584193, h = -271733879, v = -1732584194, A = 271733878, d = 0; d < o; d += 8) f[d >> 5] |= (255 & r.charCodeAt(d / 8)) << d % 32;
    f[o >> 5] |= 128 << o % 32, f[14 + (o + 64 >>> 9 << 4)] = o;
    for (d = 0; d < f.length; d += 16) {
        var g = i,
            l = h,
            y = v,
            b = A;
        h = c(h = c(h = c(h = c(h = a(h = a(h = a(h = a(h = e(h = e(h = e(h = e(h = u(h = u(h = u(h = u(h, v = u(v, A = u(A, i = u(i, h, v, A, f[d + 0], 7, -680876936), h, v, f[d + 1], 12, -389564586), i, h, f[d + 2], 17, 606105819), A, i, f[d + 3], 22, -1044525330), v = u(v, A = u(A, i = u(i, h, v, A, f[d + 4], 7, -176418897), h, v, f[d + 5], 12, 1200080426), i, h, f[d + 6], 17, -1473231341), A, i, f[d + 7], 22, -45705983), v = u(v, A = u(A, i = u(i, h, v, A, f[d + 8], 7, 1770035416), h, v, f[d + 9], 12, -1958414417), i, h, f[d + 10], 17, -42063), A, i, f[d + 11], 22, -1990404162), v = u(v, A = u(A, i = u(i, h, v, A, f[d + 12], 7, 1804603682), h, v, f[d + 13], 12, -40341101), i, h, f[d + 14], 17, -1502002290), A, i, f[d + 15], 22, 1236535329), v = e(v, A = e(A, i = e(i, h, v, A, f[d + 1], 5, -165796510), h, v, f[d + 6], 9, -1069501632), i, h, f[d + 11], 14, 643717713), A, i, f[d + 0], 20, -373897302), v = e(v, A = e(A, i = e(i, h, v, A, f[d + 5], 5, -701558691), h, v, f[d + 10], 9, 38016083), i, h, f[d + 15], 14, -660478335), A, i, f[d + 4], 20, -405537848), v = e(v, A = e(A, i = e(i, h, v, A, f[d + 9], 5, 568446438), h, v, f[d + 14], 9, -1019803690), i, h, f[d + 3], 14, -187363961), A, i, f[d + 8], 20, 1163531501), v = e(v, A = e(A, i = e(i, h, v, A, f[d + 13], 5, -1444681467), h, v, f[d + 2], 9, -51403784), i, h, f[d + 7], 14, 1735328473), A, i, f[d + 12], 20, -1926607734), v = a(v, A = a(A, i = a(i, h, v, A, f[d + 5], 4, -378558), h, v, f[d + 8], 11, -2022574463), i, h, f[d + 11], 16, 1839030562), A, i, f[d + 14], 23, -35309556), v = a(v, A = a(A, i = a(i, h, v, A, f[d + 1], 4, -1530992060), h, v, f[d + 4], 11, 1272893353), i, h, f[d + 7], 16, -155497632), A, i, f[d + 10], 23, -1094730640), v = a(v, A = a(A, i = a(i, h, v, A, f[d + 13], 4, 681279174), h, v, f[d + 0], 11, -358537222), i, h, f[d + 3], 16, -722521979), A, i, f[d + 6], 23, 76029189), v = a(v, A = a(A, i = a(i, h, v, A, f[d + 9], 4, -640364487), h, v, f[d + 12], 11, -421815835), i, h, f[d + 15], 16, 530742520), A, i, f[d + 2], 23, -995338651), v = c(v, A = c(A, i = c(i, h, v, A, f[d + 0], 6, -198630844), h, v, f[d + 7], 10, 1126891415), i, h, f[d + 14], 15, -1416354905), A, i, f[d + 5], 21, -57434055), v = c(v, A = c(A, i = c(i, h, v, A, f[d + 12], 6, 1700485571), h, v, f[d + 3], 10, -1894986606), i, h, f[d + 10], 15, -1051523), A, i, f[d + 1], 21, -2054922799), v = c(v, A = c(A, i = c(i, h, v, A, f[d + 8], 6, 1873313359), h, v, f[d + 15], 10, -30611744), i, h, f[d + 6], 15, -1560198380), A, i, f[d + 13], 21, 1309151649), v = c(v, A = c(A, i = c(i, h, v, A, f[d + 4], 6, -145523070), h, v, f[d + 11], 10, -1120210379), i, h, f[d + 2], 15, 718787259), A, i, f[d + 9], 21, -343485551), i = n(i, g), h = n(h, l), v = n(v, y), A = n(A, b)
    }
    var m = Array(i, h, v, A),
        C = "0123456789abcdef",
        j = "";
    for (d = 0; d < 4 * m.length; d++) j += C.charAt(m[d >> 2] >> d % 4 * 8 + 4 & 15) + C.charAt(m[d >> 2] >> d % 4 * 8 & 15);
    return j
}
