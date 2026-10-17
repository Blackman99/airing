# airing — design

Registered in the factory design registry before implementation (2026-10-17). Reference object: the washing line strung across a Naples vicolo — "airing your dirty laundry in public".

| 轴 | airing |
|---|---|
| 方向 | 那不勒斯小巷（vicolo）里横跨两面外墙的晾衣绳：部署目录 = 阳台上的洗衣篮；托管平台会公开的文件 = 夹到公共晾衣绳上的衣物；`.env`/密钥 = 晾出去给整条街看的猩红内衣；平台忽略的文件 = 留在篮子里；`probe` = 街上路人抬头看绳上挂了什么。习语 "airing your dirty laundry"。 |
| 底色明度 | 中浅、饱和天空蓝（#9ccbe6 铺满全站），全站唯一的天蓝底；非 drainready 港雾 #e6ecef（近灰极浅）、非 undomap 勘测青灰 #cfdce3（灰青）、非 packfence 海军；无渐变、无深色底 |
| 配色 (hex) | #9ccbe6 天空 · #c8643f 赤陶外墙 · #e9a58c 鲑粉外墙 · #2c5b4c 百叶窗绿 · #17242f 夜蓝墨（文字/绳）· #f7f9f8 亚麻白（普通衣物）· #b88a55 木夹 · #df2a40 猩红（仅用于曝光的密钥衣物，不作圈注/红叉/盖章）· #6e7f8c 石板灰（留在篮子里的文件）· #4a5a9a 靛蓝（已上传到平台构建机、未必公开）；无渐变、无发光、无玻璃 |
| 字体 | Bodoni Moda 600/800 italic（意大利帕尔马 Bodoni 体，只用于床单上的标题与大理石路牌）+ Karla 400/700（正文）+ Fira Code 400/500（仅命令、路径、键名）；三家族均未登记 |
| 质感 | 灰泥外墙：不规则多边形两色平涂补丁 + 墙面剥落露出的砖块；百叶窗为等距横条；晾衣绳为两股绞合的虚线麻绳；无纸、无颗粒、无投影、无扫描线、无木纹、无金属拉丝 |
| 渲染技法 | 物理驱动内联 SVG：晾衣绳按悬链线 cosh 计算下垂（挂的衣物越多垂得越深），每件衣物是一个阻尼摆（rAF 弹簧积分 + 平滑风场噪声），滑轮绳把衣物从阳台沿绳送出；全站首个用实时物理模拟的项目 |
| 版式 | 首屏是仰视的小巷：左右两面外墙压住屏幕两侧（百叶窗、阳台、花盆），中间天空横跨晾衣绳；h1 是最高那根绳上的一张大床单，Bodoni 斜体写 "airing"；左墙上一块大理石路牌写一句话定位；阳台上的洗衣篮就是拖放区；平台切换是阳台栏杆上挂的六块木牌；下方各节是同一面墙往下的楼层窗口（每节一扇窗，百叶随滚动打开），无卡片栅格、无左文右卡 |
| 动画语言 | 滑轮转动 → 衣物沿绳逐件滑出并被木夹夹住、落定时按阻尼摆晃几下 → 猩红衣物落定后翻出吊牌 "PUBLIC · GOOGLE_API_KEY"；切换平台时绳收回、按该平台真实忽略规则重新晾（Netlify 把点文件留在篮子里，Cloudflare Pages 把 `.env` 晾出去）；风持续轻摆；尊重 prefers-reduced-motion（直接终态、无风摆） |
| Logo 构造 | 两根木桩之间一道下垂的麻绳，两枚木夹夹住一条猩红三角内裤，内裤上一个钥匙孔镂空；透明底，非圆角方形 app 图标、无粗描边卡通；favicon 为绳 + 猩红内裤 |

## Implementation notes
- The hero line is a real catenary (`cosh`), sagging deeper the more garments hang; each garment is a damped pendulum (rAF spring + smooth wind noise). `prefers-reduced-motion`: final state, no wind.
- Every garment, tag and verdict is produced by the CLI's own `scan()` + `hostFilter()` bundled into `app.js` — no fixtures. Switching host reels the line in and re-hangs it with that host's real rules.
- Below the hero, each floor is separated by its own wall-to-wall washing line (drawn by `floorLines()`), hanging what that floor is about.
- Wide layout from 1180 px and aspect > 1.15; below that the stacked layout (alley → plaque → host tags → verdict → drop zone).
- Share images (`og.png`, `social-preview.png`) and `assets/demo.gif` are rendered from the live page in `?poster` mode (2× then Lanczos-downscaled).
