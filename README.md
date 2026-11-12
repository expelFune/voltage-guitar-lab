# 弦上实验室 · Voltage Guitar Lab

看见音符，听见关系，动手弹出来。  
See the notes. Hear the connections. Play them yourself.

**[打开网站 / Open website](https://expelfune.github.io/voltage-guitar-lab/index.html)** · **[版本发布 / Releases](https://github.com/expelFune/voltage-guitar-lab/releases)** · **[GitHub 仓库 / Repository](https://github.com/expelFune/voltage-guitar-lab)**

[简体中文](#简体中文) | [English](#english)

## 简体中文

弦上实验室是一个可以边听、边看、边弹的电吉他学习与练习网站。把音阶、和弦、节奏、调音和练耳放在同一个页面里，打开浏览器就能使用，无需注册。支持电脑和手机，网站界面目前以中文为主。

### 直接在线使用

**[点击这里打开弦上实验室](https://expelfune.github.io/voltage-guitar-lab/index.html)**。这是可分享给其他人的公开网址，手机和电脑都能直接访问，无需下载或运行任何命令。

[Releases 版本发布页](https://github.com/expelFune/voltage-guitar-lab/releases) 用于查看版本说明，每个版本说明中也可以放上在线网址；实际网站由 GitHub Pages 托管。

### 功能

- **[互动指板](https://expelfune.github.io/voltage-guitar-lab/index.html#lab)**：以标准调弦 E A D G B E 为基准，提供完整的 0–24 品，支持 12 个根音、多种音阶与不同把位；可切换音名、音级或查看所有音。点击音符试听，手机可多指按音；横划浏览指板，竖划滚动页面。试听音阶时，正在播放的位置会逐个高亮，并显示音名、弦号和品位。
- **[和弦图鉴](https://expelfune.github.io/voltage-guitar-lab/index.html#chords)**：输入 `C`、`Am7`、`F#7` 等和弦名，查看组成音、开放和弦及不同把位的指法。彩色手指标记配合竖向指板，可以逐弦拨奏或横扫试听。
- **[节拍练习](https://expelfune.github.io/voltage-guitar-lab/index.html#practice)**：自己输入 `C G Am F`，或按所选调性输入 `1645` 等级数进行。内置卡农 `15634145`、流行 `1564`、爵士 `251` 和 12 小节布鲁斯等预设；支持调整速度、拍数、和弦指法，以及扫弦或分解伴奏。和弦进行及所选练习调性、调式保存在当前浏览器中。
- **[调音器与识音](https://expelfune.github.io/voltage-guitar-lab/index.html#tuner)**：支持标准调弦、Drop D、Drop C 等预设，也可自定义六根弦的目标音。显示音名、频率、音分偏差和输入音量，支持自由识别单个音的音名，并可调整灵敏度和 A4 基准频率。
- **[钢琴与练耳](https://expelfune.github.io/voltage-guitar-lab/index.html#piano)**：可弹奏 C1–C8，选择显示的八度范围、连续拖动音域和调整键宽。支持手机多点触控、放大横向布局，以及电脑键盘映射。放大后默认从 C4 开始显示两组八度。练耳可随机出 1–3 个音，选择出题音域、是否包含黑键、同时或依次播放、是否区分八度，以及是否先给标准音。

### 使用小提示

- 点击页面中的试听按钮或琴键开始发声；调音时点击“开启麦克风”并允许访问麦克风。
- 调音尽量在安静环境中一次拨一根弦。麦克风音频在浏览器本机分析，不上传服务器。
- 电脑钢琴映射为 `A W S E D F T G Y H U J K O L P ;`，对应当前起始音区的连续半音。放大后按 `Esc` 退出。
- 手机的原生全屏、方向锁定和可同时触控数量取决于浏览器与设备；不支持原生方向锁定时，页面会使用横向布局。
- 若手机仍显示旧功能，可从 [index.html 入口](https://expelfune.github.io/voltage-guitar-lab/index.html) 重新打开并刷新。

### 本地运行（仅开发者需要）

项目是静态网站，使用 HTML、CSS、原生 JavaScript、SVG 和 Web Audio API，无需安装前端依赖。安装 Git 和 Python 3 后，在终端运行：

```sh
git clone https://github.com/expelFune/voltage-guitar-lab.git
cd voltage-guitar-lab
python -m http.server 8080
```

上面的命令启动成功后，才在同一台电脑的浏览器中输入 `http://localhost:8080`。这只是本机开发地址，不是网站的公开网址，也不能分享给其他人使用。只想使用网站，请点击上方的“直接在线使用”。调音器需要麦克风权限，本地测试请通过 localhost 访问。

GitHub 仓库的网页文件位于根目录：`index.html` 是页面入口，`music.js` 提供乐理数据与和弦计算，`app.js` 负责指板和节拍练习，`neck.js` 绘制和弦指板，`tuner.js` 与 `piano.js` 分别提供调音和钢琴练耳，`style.css` 控制样式。`assets/` 保存带内容版本标记的脚本与样式，发布时需与入口引用保持一致。

欢迎通过 [GitHub Issues](https://github.com/expelFune/voltage-guitar-lab/issues) 反馈问题或提出功能建议。手机问题请附上设备型号、浏览器名称和复现步骤。

## English

Voltage Guitar Lab is an interactive electric guitar learning and practice website. Explore scales, chords, rhythm, tuning, and ear training in one place—listen, look, and play directly in your browser. No account is required. It works on desktop and mobile; the website interface is currently primarily in Chinese.

### Use the website online

**[Open Voltage Guitar Lab](https://expelfune.github.io/voltage-guitar-lab/index.html)**. This is the public, shareable website address. Open it on your phone or computer without downloading files or running commands.

The [Releases page](https://github.com/expelFune/voltage-guitar-lab/releases) is for version notes and can also include the live website link. The live website is hosted on GitHub Pages.

### Features

- **[Interactive fretboard](https://expelfune.github.io/voltage-guitar-lab/index.html#lab)**: Explore frets 0–24 in standard E A D G B E tuning, all 12 root notes, multiple scales, and different positions. Switch between note names and scale degrees, or show every note. Tap to listen and use multiple fingers on mobile. Swipe horizontally to explore the neck or vertically to scroll the page. Scale playback highlights each played position and shows its note, string, and fret.
- **[Chord library](https://expelfune.github.io/voltage-guitar-lab/index.html#chords)**: Enter chord names such as `C`, `Am7`, or `F#7` to see chord tones, open shapes, and voicings at different positions. Color-coded finger markers and a vertical neck diagram let you hear individual strings or strum across them.
- **[Rhythm practice](https://expelfune.github.io/voltage-guitar-lab/index.html#practice)**: Build a progression with chord names such as `C G Am F`, or enter degrees such as `1645` in your chosen key. Presets include the Canon progression `15634145`, pop `1564`, jazz `251`, and 12-bar blues. Adjust tempo, beats per bar, voicings, and strummed or arpeggiated accompaniment. Your progression and selected practice key/mode are saved in the current browser.
- **[Tuner and pitch detection](https://expelfune.github.io/voltage-guitar-lab/index.html#tuner)**: Choose standard tuning, Drop D, Drop C, other presets, or custom targets for all six strings. See note names, frequencies, cent deviations, and input levels. Identify individual notes in chromatic mode and adjust sensitivity or the A4 reference frequency.
- **[Piano and ear training](https://expelfune.github.io/voltage-guitar-lab/index.html#piano)**: Play C1–C8, choose the visible octave span, pan continuously, and resize the keys. Supports mobile multitouch, an expanded landscape layout, and computer keyboard mapping. The expanded view opens at C4 with a two-octave span. Ear training generates 1–3 notes with selectable ranges, white keys or all semitones, simultaneous or sequential playback, optional octave-sensitive answers, and an optional reference tone.

### Tips

- Tap a playback button or a key to start audio. For tuning, tap “开启麦克风” (Enable microphone) and grant microphone access.
- Tune one string at a time in a quiet environment. Microphone audio is analyzed locally in your browser and is not uploaded to a server.
- Piano keyboard mapping: `A W S E D F T G Y H U J K O L P ;`. These keys play consecutive semitones from the current starting octave. Press `Esc` to leave the expanded view on desktop.
- Native fullscreen, orientation locking, and the number of simultaneous touches depend on your browser and device. A landscape page layout is used when native orientation locking is unavailable.
- If a mobile browser still shows older features, reopen the [index.html entry](https://expelfune.github.io/voltage-guitar-lab/index.html) and refresh.

### Run locally (for developers only)

The site uses HTML, CSS, vanilla JavaScript, SVG, and the Web Audio API. No frontend dependencies are required. With Git and Python 3 installed, run:

```sh
git clone https://github.com/expelFune/voltage-guitar-lab.git
cd voltage-guitar-lab
python -m http.server 8080
```

Only after the server above is running, enter `http://localhost:8080` in a browser on that same computer. This is a local development address, not the public website, and cannot be shared as the website link. To use the site directly, follow “Use the website online” above. The tuner requires microphone permission; use localhost for local testing.

In the GitHub repository, the website files live at the root: `index.html` is the entry page; `music.js` contains music theory data and chord calculations; `app.js` handles the fretboard and rhythm practice; `neck.js` draws chord neck diagrams; `tuner.js` and `piano.js` provide tuning and piano/ear training; and `style.css` defines the appearance. The `assets/` directory holds content-versioned scripts and styles, which must stay in sync with the entry page when publishing.

Report bugs or suggest features through [GitHub Issues](https://github.com/expelFune/voltage-guitar-lab/issues). For mobile issues, please include your device model, browser, and steps to reproduce.
