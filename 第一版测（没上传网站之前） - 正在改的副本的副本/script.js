// ======================
// 状态变量
// ======================

const state = {

    favor:0,
    // favor：好感度

    darkVal:0
    // darkVal：黑化值
};

// ======================
// 获取HTML元素
// ======================

const background =
document.getElementById("background");

const speaker =
document.getElementById("speaker");

const storyText =
document.getElementById("story-text");

const storyArea =
document.getElementById("story-area");

const choices =
document.getElementById("choices");

const bgm =
document.getElementById("bgm");

const homeFx =
document.getElementById("home-fx");

function setHomeScene(active){

    document.body.classList.toggle(
        "scene-home",
        active
    );

    if(homeFx){

        homeFx.hidden = !active;
    }

    if(active){

        const timeTag =
        homeFx.querySelector(".home-tag--tr");

        if(timeTag){

            const h = new Date().getHours();
            const m = String(new Date().getMinutes()).padStart(2, "0");
            const ampm = h >= 12 ? "PM" : "AM";
            const hour12 = h % 12 || 12;

            timeTag.textContent =
            `${String(hour12).padStart(2, "0")}:${m} ${ampm}`;
        }
    }
}

// ======================
// 文本分页
// ======================

let textPages = [];
let currentPageIndex = 0;
let pendingChoices = null;
let typewriterTimer = null;
let typewriterDone = false;
let lastSceneText = null;

function clearTypewriter(){

    if(typewriterTimer){

        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
}

function getTextPageMaxHeight(){

    const areaStyle =
    getComputedStyle(storyArea);

    const paddingTop =
    parseFloat(areaStyle.paddingTop);

    const paddingBottom =
    parseFloat(areaStyle.paddingBottom);

    const speakerEl =
    document.getElementById("speaker");

    const authorEl =
    document.getElementById("author");

    let used =
    speakerEl.offsetHeight +
    authorEl.offsetHeight +
    paddingTop +
    paddingBottom +
    24;

    return Math.max(
        80,
        storyArea.clientHeight - used
    );
}

function splitTextIntoPages(text){

    if(!text || !text.trim()){

        return [""];
    }

    const maxHeight = getTextPageMaxHeight();

    const measure =
    document.createElement("div");

    const textStyle =
    getComputedStyle(storyText);

    measure.style.position = "absolute";
    measure.style.visibility = "hidden";
    measure.style.pointerEvents = "none";
    measure.style.left = "-9999px";
    const areaPadding =
    parseFloat(getComputedStyle(storyArea).paddingLeft) +
    parseFloat(getComputedStyle(storyArea).paddingRight);

    const textWidth =
    storyText.clientWidth ||
    storyArea.clientWidth - areaPadding;

    measure.style.width = textWidth + "px";
    measure.style.fontSize = textStyle.fontSize;
    measure.style.lineHeight = textStyle.lineHeight;
    measure.style.whiteSpace = "pre-wrap";
    measure.style.wordBreak = "break-word";
    measure.style.fontFamily = textStyle.fontFamily;

    document.body.appendChild(measure);

    const pages = [];
    let remaining = text;

    while(remaining.length > 0){

        let low = 1;
        let high = remaining.length;
        let fit = 1;

        while(low <= high){

            const mid =
            Math.floor((low + high) / 2);

            measure.innerText =
            remaining.slice(0, mid);

            if(measure.scrollHeight <= maxHeight){

                fit = mid;
                low = mid + 1;
            }
            else{

                high = mid - 1;
            }
        }

        let cut = fit;

        if(cut < remaining.length){

            const chunk =
            remaining.slice(0, cut);

            const lastBreak =
            chunk.lastIndexOf("\n");

            if(lastBreak > cut * 0.4){

                cut = lastBreak + 1;
            }
        }

        pages.push(
        remaining.slice(0, cut)
        );

        remaining =
        remaining.slice(cut);
    }

    document.body.removeChild(measure);

    return pages.length ? pages : [""];
}

function setChoicesVisible(visible){

    document.body.classList.toggle(
        "has-choices",
        visible
    );
}

function renderChoices(choiceList){

    choices.innerHTML = "";

    setChoicesVisible(true);

    choiceList.forEach(choice=>{

        const button =
        document.createElement("button");

        button.className =
        "choice-btn";

        button.innerText =
        choice.text;

        button.onclick = ()=>{

            const click =
            new Audio(
            "assets/audio/click.mp3"
            );

            click.play();

            if(choice.effect){

                choice.effect();
            }

            renderScene(choice.next);
        };

        choices.appendChild(button);
    });
}

function showTextPage(pageIndex){

    currentPageIndex = pageIndex;

    choices.innerHTML = "";
    setChoicesVisible(false);

    clearTypewriter();
    typewriterDone = false;

    const pageText =
    textPages[pageIndex];

    storyText.innerText = "";

    let index = 0;

    typewriterTimer = setInterval(()=>{

        storyText.innerText +=
        pageText.charAt(index);

        index++;

        if(index >= pageText.length){

            clearTypewriter();
            typewriterDone = true;

            if(pageIndex === textPages.length - 1){

                renderChoices(pendingChoices);
            }
        }

    }, 35);
}

function finishCurrentPage(){

    clearTypewriter();

    storyText.innerText =
    textPages[currentPageIndex];

    typewriterDone = true;

    if(currentPageIndex === textPages.length - 1){

        renderChoices(pendingChoices);
    }
}

function canTapToAdvance(){

    return choices.children.length === 0;
}

function onTapAdvance(event){

    if(!canTapToAdvance()){

        return;
    }

    if(event.target.closest(".choice-btn")){

        return;
    }

    if(typewriterTimer){

        finishCurrentPage();
        return;
    }

    if(currentPageIndex < textPages.length - 1){

        showTextPage(currentPageIndex + 1);
    }
}

document.addEventListener("click", onTapAdvance);

// 在 `...` 里空一行（两个换行）= 新的一页，点击切换
function splitByBlankLine(text){

    if(!text || !/\n\s*\n/.test(text)){

        return null;
    }

    return text
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

function prepareTextPages(text){

    lastSceneText = text;

    let sections = null;

    if(Array.isArray(text)){

        sections = text
        .map(part => String(part).trim())
        .filter(part => part.length > 0);
    }
    else{

        sections = splitByBlankLine(text);
    }

    // 使用手动分页

    if(sections && sections.length > 0){

        textPages = sections;
    }

    // 没有空行
    // 整段作为一页

    else{

        textPages = [
            String(text ?? "")
        ];
    }

    if(!textPages.length){

        textPages = [""];
    }

    return textPages;
}


window.addEventListener("resize", ()=>{

    if(!textPages.length || lastSceneText == null){

        return;
    }

    const page =
    currentPageIndex;

    prepareTextPages(lastSceneText);

    currentPageIndex =
    Math.min(page, textPages.length - 1);

    finishCurrentPage();
});

// ======================
// 场景数据
// ======================

const scenes = {

    home:{

        bg:"assets/bg/首页.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"",

        text:
`青春崆峒男高会梦见属于自己的直男吗?

点击开始进入梦境。`,

        choices:[

            {

                text:"开始",

                next:"tip"
            }
        ]
    },

    tip:{

        bg:"assets/bg/首页.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"阅前规则",

        text:[

    `请先知晓该世界规则：
    1. 本游戏仅为非商业同人互动作品，仅限同人交流，请勿上升真人。
    2. 所有图片音乐素材均来源于网络，侵权删。
    3. 文本均由作者编写，如有雷同纯属巧合。
    4. 第一次制作bug较多，尚有不足之处，欢迎大家捉虫或提供灵感！
    5.好感度和黑化值为隐藏数值，永远在未完待续。`
       ],

        choices:[

            {

                text:"进入梦境",

                next:"yan1"
            }
        ]
    },

    yan1:{

        bg:"assets/bg/严1.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `你叫严成玹，今年十七岁。
    爱好是听小众音乐，品小众人生，喜欢巴西莓碗，特别的属于你的东西。
    以及最重要的一点——
    你是个崆峒直男。

    因机缘巧合，你降临到了一个绝对全部都是同性恋的世界，
    并变成了千成高中的一名堂堂男高中生，
    随时有变成同性恋的风险。
    但你不想，那种事情不要啊！
    为了制止这种情况，你开始了自己艰难而又漫长的生活。`
    
    ],

        choices:[

            {

                text:"继续",

                next:"hallway"
            }
        ]
    },

    hallway:{

        bg:"assets/bg/走廊.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `这天也是平平无奇的一天，你正在走廊上走路，
    忽然，你发现有人朝你这个方向走来。

    他踉踉跄跄的，好像有点奇怪，这时，你会——。`
    
    ],

        choices:[

            {

                text:"我那么善良，当然要扶住他",

                effect:()=>{

                    state.favor +=1;
                },

                next:"an1"
            },

            {

                text:"我崆峒！快速走开",

                effect:()=>{

                    state.darkVal +=1;
                },

                next:"bad1"
            }
        ]
    },

    an1:{

        bg:"assets/bg/安1.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `“你没事吧？”

    你人美心善地扶住了他。伴随你的询问，他稳住了步伐，
    有点惊讶地看了你一眼后，瓮声瓮气地说谢谢你。
    原来是他的脚不小心扭伤了，你扶了他去医务室，
    而此时，也才认出来这个人是谁——

    是学生，是欧巴，是小名鼎鼎游泳运动员，
    清潭洞杀手，梨泰院富人，
    是走在街上会被注视着要一百次手机号的看起来有点冷漠
    也还是想要手机号那家伙——安乾镐
    同时也是——这个世界里的主角。

    跟主角扯上关系肯定没有好事!
    顿时你警铃大作，他却冲你帅气地笑了一下。`
    
    ],

        choices:[

            {

                text:"继续",

                next:"an2"
            }
        ]
    },

    an2:{

        bg:"assets/bg/安1.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"安乾镐",

        text:[

    `他跟你说了自己的名字，以及为了表达感谢，晚上想请你吃饭
    你本准备拒绝，但他立马流露出了委屈的表情，

    你被亮闪闪地攻击了，只能答应。

    “对了。”他又突然想了起来，“我还没问你的名字呢。” `
    
    ],

        choices:[

            {

                text:"严成玹。你呢？",

                next:"restaurant"
            },

            {

                text:"举手之劳啦。不用在意那么多。",

                effect:()=>{

                    state.darkVal +=1;
                },

                next:"an3"
            }
        ]
    },

    an3:{

        bg:"assets/bg/安2.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"安乾镐",

        text:[

    `“莫呀?”见你这么回答，他沉下了表情，
    “为什么不告诉我名字?”，一点点逼近你，
    
    “你讨厌我吗?”，你有点被吓到了`
    
    ],

        choices:[

            {

                text:"火速告诉他并约定之后见",

                next:"restaurant"
            }
        ]
    },

    restaurant:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `你告诉了他名字，并在晚上如约而至校门口的一家烤肉店。

    当你推门进来的时候，你注意到周围人都纷纷侧目。
    而安乾镐已经坐在那里等你。
    但你很镇定，面不改色地走了过去。

    安乾镐笑眯眯看向你，热心地问你要吃什么。
    你说简单点就行，开始烤肉。`
    
    ],
  
        choices:[

            {

                text:"继续",

                next:"restaurant2"
            }
        ]
    },

    restaurant2:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `过了一会儿，身边突然有人拍了拍你的肩膀。

    “欸，这不是成玹吗?”

    你一惊，抬头，发现是你的一个同班同学路人甲，
    他一点边界感都没有地揽住了你的肩膀，好像跟你知心知己，然而呢
    你的毛都快要炸起来了！`
    
    ],

        choices:[

            {

                text:"忍了一下又忍了一下",

                effect:()=>{

                    state.darkVal +=1;
                },

                next:"restaurant3"
            },

            {

                text:"不动声色推开他",

                effect:()=>{

                    state.favor +=1;
                },

                next:"restaurant4"
            }
        ]
    },

    restaurant3:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `毕竟同学一场，你跟他打了招呼。
    路人甲同学又问你可以参与吗，你也同意了。

    没想到随即，
    你感到有道极其幽怨不满的目光投了过来。
    哎哎哎……？！`

    ],

    choices:[

        {

            text:"主动问安乾镐要喝饮料吗",

            effect:()=>{

                state.favor +=1;
            },

            next:"restaurant10"
        },

        {

            text:"装作没看到",

            effect:()=>{

                state.darkVal +=1;
            },

            next:"restaurant10"
        }
    ]
    },

    restaurant4:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `你扯出微笑，跟他打了招呼，
    没想到路人甲这个二货竟也毫无眼力见地直接坐下了。
    你要炸了。
    但炸掉的显然不止你一个。

    “多吃点，成玹。”

    安乾镐不断地给你碗里夹烤肉，并对多出来的人视而不见。
    很快你的碗里就堆成了一座小山，
    路人甲同学显然也注意到了。

    “成玹，这位是？”`

    ],

    choices:[

        {

            text:"同学，我帮了他一个忙，所以请我吃饭呢。",

            effect:()=>{

                state.darkVal +=1;
            },

            next:"restaurant10"
        },

        {

            text:"你不认识他？",

            effect:()=>{

                state.favor +=1;

                state.darkVal +=2;
            },

            next:"restaurant10"
        },

        {

            text:"我朋友乾镐。",

            effect:()=>{

                state.favor +=2;
            },

            next:"restaurant10"
        }
    ]
    },

    restaurant10:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `路人甲看了安乾镐一会，
    好像忽然想起了什么，才拍了拍脑袋，
    “啊啊啊，原来是你啊。”
    他朝安乾镐伸出手。
    但安乾镐并没有握，只是朝他礼貌地颔首，便继续烤肉。

    这时你刚好问了安乾镐要不要喝饮料，
    安乾镐这才面朝你，笑眯眯地点点头。

    “好呀。”他说。
    “你喝什么，我就喝什么。”
    这时，你会选——`

    ],

    choices:[

        {

            text:"柠檬水",

            next:"restaurant11"
        },

        {

            text:"草莓奶昔",

            effect:()=>{

                state.favor +=2;
            },

            next:"restaurant11"
        },

        {

            text:"热巧克力",

            effect:()=>{

                state.favor +=1;
            },

            next:"restaurant11"
        }
    ]
    },

    restaurant11:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"安乾镐",

        text:[

    `过了一会，
    安乾镐突然又问你想不想吃甜食。

    你当然想——`

    ],

    choices:[

        {

            text:"巴西莓碗",

            effect:()=>{

                state.favor +=2;

                state.darkVal +=1;
            },

            next:"restaurant12"
        },

        {

            text:"冰激凌",

            effect:()=>{

                state.favor +=3;
            },

            next:"restaurant12"
        },

        {

            text:"热巧克力",

            next:"restaurant12"
        }
    ]
    },

    restaurant12:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `这期间，路人甲同学依然毫无眼力见，
    朝你又是勾肩又是搭背。
    你的gay又响了！并且感到极其不适

    这时，安乾镐忽然开口问你。
    “要不要坐我这边？”
    看着一边是绝对会遵守世界法则生存的男主角，
    一边是实力不详取向未知的缺心眼同学。

    你会——`

    ],

    choices:[

        {

            text:"两腿一蹬就过去",

            effect:()=>{

                state.favor +=3;
            },

            next:"restaurant13"
        },

        {

            text:"没关系的",

            effect:()=>{

                state.darkVal +=2;
            },

            next:"restaurant15"
        },

        {

            text:"犹豫着过去了",

            effect:()=>{

                state.favor +=1;

                state.darkVal +=2;
            },

            next:"restaurant14"
        }
    ]
    },

    restaurant13:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `你二话不说就溜了过去，
    安乾镐脸上露出了一种很得意的挑衅表情（？）。
    并更加积极地问你要吃哪些。

    好吧。
    你只能心安理得地接受了他的服务了。`

    ],

    choices:[

        {

            text:"继续",

            next:"restaurant16"
        }
    ]
    },

    restaurant14:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `因为担心逃离得有点过于明显，
    你犹豫着坐了过去。
    不过看上去，就像是你在非常舍不得。

    安乾镐脸上露出一种奇怪的表情，
    不过转眼间也便表现得若无其事。

    你们吃饭时一直在聊天。
    期间，你还发现他会时不时截断你和路人甲同学之间的对话。

    是错觉吗？
    是错觉吧。`

    ],

    choices:[

        {

            text:"继续",

            next:"restaurant16"
        }
    ]
    },

    restaurant15:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `但我更害怕你啊！
    你心里这么想着，但表面还是在四平八稳地说没关系，
    安乾镐眼神里流露出一种你看不懂的埋怨。

    你们吃饭时一直在聊天，
    但多数时候都是路人甲在说话，
    安乾镐则在闷头吃饭，
    不知为何，
    你慢慢变得好像也没有什么心情了。`

    ],

    choices:[

        {

            text:"继续",

            next:"restaurant16"
        }
    ]
    },

    restaurant16:{

        bg:"assets/bg/餐厅.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:
    `等到饭局终于接近尾声，
    你放下筷子，心里五味杂陈——

    这一晚，似乎改变了一些什么。`,

        choices:[

            {

                text:"继续",

                next:"restaurant17"
            }
    ]
    },
    
    restaurant17:{

            bg:"assets/bg/走廊.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `第二天，
    你照常来到教室，一切看起来仍是那么平静。
    直到班长突然过来询问你，
    他说最近学生会主办的文艺晚会即将举行，问你是否
    有兴趣参加。
    一般这种活动都很容易触发意料不到的罗曼蒂克情节，
    因而你十分谨慎。
    班长却告诉你，
    这仅仅是参加一个小话剧。
    
    “只是担任个跑龙套的小角色啦，
    不要担心——”`
    
            ],
    
            choices:[
    
                {
    
                    text:"我怎么还是有点慌呢？",
    
                    effect:()=>{
    
                        state.darkVal +=2;
                    },
    
                    next:"hallway18"
                },
    
                {
    
                    text:"能先问一下，都有谁吗？",
    
                    effect:()=>{
    
                        state.favor +=2;
                    },
    
                    next:"hallway18"
                },
    
                {
    
                    text:"那好吧。",
    
                    effect:()=>{
    
                        state.favor +=1;
    
                        state.darkVal +=1;
                    },
    
                    next:"hallway19"
                }
            ]
        },
    
        hallway18:{
    
            bg:"assets/bg/舞台.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"班长",
    
            text:[
    
    `“别慌，就是参考了罗密欧与朱丽叶相遇桥段
    然后改编好的爱情题材话剧啦。”
    班长拍了拍你的肩膀，
    并跟你说参演人员都很不错，你就放心地去吧就好了。
    
    而直到在排练现场。
    你看着男主的出现，心中一阵雪花飘飘。你就知道主角会是他。
    
    通常男主存在的地方，就是人群聚集的世界中心。
    
    这时，你会——`
    
            ],
    
            choices:[
    
                {
    
                    text:"尽可能躲避",
    
                    effect:()=>{
    
                        state.darkVal +=2;
                    },
    
                    next:"stage20"
                },
    
                {
    
                    text:"我只是个直男我为什么要怕！",
    
                    effect:()=>{
    
                        state.darkVal +=1;
                    },
    
                    next:"stage20"
                },
    
                {
    
                    text:"主动打招呼",
    
                    effect:()=>{
    
                        state.favor +=1;
    
                        state.darkVal +=1;
                    },
    
                    next:"stage21"
                }
            ]
        },
    
        hallway19:{
    
            bg:"assets/bg/舞台.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `班长龙颜大悦，并告诉你，
    这是一部参考了罗密欧与朱丽叶相遇桥段
    进行改编的爱情题材话剧。
    类似的故事……？
    这一听就很不详。
    
    而直到在排练现场， 你看着男主的出现，
    心中果真雪花飘飘。
    
    通常，男主存在的地方，就是人群聚集的世界中心。
    
    这时，你会——`
    
            ],
    
            choices:[
    
                {
    
                    text:"尽可能躲避",
    
                    effect:()=>{
    
                        state.darkVal +=2;
                    },
    
                    next:"stage20"
                },
    
                {
    
                    text:"我只是个直男我为什么要怕！",
    
                    effect:()=>{
    
                        state.darkVal +=1;
                    },
    
                    next:"stage20"
                },
    
                {
    
                    text:"主动打招呼",
    
                    effect:()=>{
    
                        state.favor +=1;
    
                        state.darkVal +=1;
                    },
    
                    next:"stage21"
                }
            ]
        },
    
        stage20:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `抱着多一事不如少一事的态度，
    你只打算低着头好好做人。
    却没想到，对方先主动叫住了你。
    
    “哎，成玹？”安乾镐问。
    “你也来参加吗？”
    
    面对着安乾镐的笑容，你不得不也保持微笑，
    但告诉他自己只是个跑龙套的，并没有什么重要情节。
    
    但安乾镐却说没关系，
    
    “成玹在哪里都能发光。”`
    
            ],
    
            choices:[
    
                {
    
                    text:"继续",
    
                    next:"yan2"
                }
            ]
        },
    
        stage21:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `你主动跟安乾镐打了招呼， 
    对方看到你后似乎十分惊喜，
     “你也来参加吗？”
    
    你点点头，但告诉他自己只是个跑龙套的。
    安乾镐却说没关系，
    “成玹在哪里都能发光。”`
    
            ],
    
            choices:[
    
                {
    
                    text:"继续",
    
                    next:"yan2"
                }
            ]
        },
    
        yan2:{
    
            bg:"assets/bg/严2.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `你心中一动欲要开口，他却又已被导演叫走。
    临走前他跟你挥了挥手，“结束后等我一起走吧。”
    而工作不多的你在角落充当背景板，好奇地观察着他认真工作的样子。
    该说应该不愧是男主吗……你觉得他的样子很适合罗密欧的形象，
    但谁又会是他现实中的朱丽叶呢？
    同时你也了解了大致剧情，
    男主女主在学校舞会上通过一场乌龙相识并一见钟情，
    历经了魔幻现实层面的种种阻碍，躲避了从天而降的外星陨石，
    阻止了各方不知名路人的横插一脚，违背了学校不许谈恋爱法则。
    顺带治疗了一下分离焦虑障碍，最终两个健全人幸幸福福地生活在了一起。
    而你的角色就是那群不知名路人中的一员，
    负责在某个教室中突然登场说：“你为什么要跟他在一起！”
    的那种莫名其妙的同学。
    以及总觉得这个剧情为什么那么眼熟啊？！
    而故事也终于到了你的表演环节，作为那个爱情路上的绊脚石，
    你会——`
    
            ],
    
            choices:[
    
                {
    
                    text:"你们不许在一起！",
    
                    effect:()=>{
    
                        state.favor +=1;
                    },
    
                    next:"an4_23"
                },
    
                {
    
                    text:"我不同意你们在一起！",
    
                    effect:()=>{
    
                        state.favor +=2;
                    },
    
                    next:"an4_24"
                }
            ]
        },
    
        an4_23:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `你大跳出来对安乾镐说了台词，他尽职尽责地跟你对了戏。
    “为什么？”他反问道。
    你心里想着这当然是剧本要求的我怎么知道。
    回答出来的却是 “不知道但是我就是要代表世界阻拦你们，你跟世界说去吧！”
    “那如果——”
    安乾镐又说，
    “我执意喜欢他呢？”
    
    明明是要对心仪对象说的话，
    但他的视线，
    却好像一直在盯着你不放。
    
    啊，你忽然有点忐忑起来——`
    
            ],
    
            choices:[
    
                {
    
                    text:"躲开视线",
    
                    effect:()=>{
    
                        state.darkVal +=2;
                    },
    
                    next:"an4_25"
                },
    
                {
    
                    text:"那就看能不能过得我这一关吧！！",
    
                    effect:()=>{
    
                        state.favor +=1;
    
                        state.darkVal +=1;
                    },
    
                    next:"an4_26"
                }
            ]
        },
    
        an4_24:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `你大跳出来对安乾镐说了台词，他尽职尽责地跟你对了戏。
    “为什么？”他反问道。
    你心里想着这当然是剧本要求的我怎么知道。
    回答出来的却是，
    “不知道但是我就是要代表世界阻拦你们，你跟世界说去吧！”
    
    “那如果——”安乾镐又说，
    “我执意喜欢他呢？”
    明明是要对心仪对象说的话，
    但他的视线却好像一直在盯着你不放。
    
    啊，你忽然有点忐忑起来——`
    
            ],
    
            choices:[
    
                {
    
                    text:"那就看能不能过得我这一关吧！！",
    
                    effect:()=>{
    
                        state.favor +=1;
    
                        state.darkVal +=1;
                    },
    
                    next:"an4_26"
                },
    
                {
    
                    text:"躲开视线",
    
                    effect:()=>{
    
                        state.darkVal +=2;
                    },
    
                    next:"an4_25"
                }
            ]
        },
    
        an4_25:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `你下意识地移开了和他对视的视线，
    “那就看能不能过得我这一关吧！”
    然后气哄哄地走了出去，准备要向教导主任告发。
    而在踏出门那一刻，安乾镐就按照剧情向前冲出来拦住了你，
    本该是要无奈地直接把你“敲晕”的情节，
    但在下手那一刻，
    你好像听到他在耳边用只能你俩听到的音量说
    
    “你最好会让我过去。”
    
    这并不是台词里有的话，不过你还能没琢磨出来这是几个意思，
    下一秒就先要“晕了过去”，
    无暇顾及了。`
    
            ],
    
            choices:[
    
                {
    
                    text:"继续",
    
                    next:"scene27"
                }
            ]
        },
    
        an4_26:{
    
            bg:"assets/bg/安4.jpg",
    
            music:"assets/audio/轻快.mp3",
    
            speaker:"旁白",
    
            text:[
    
    `“那就看能不能过得我这一关吧！”
    你说完，然后气哄哄地走了出去，
    准备要向教导主任告发。
    而在踏出门那一刻，
    安乾镐就按照剧情向前冲出来拦住了你，
    
    本该是要无奈地直接把你“敲晕”的情节，
    但在下手那一刻，
    你好像听到他在耳边用只能你俩听到的音量，
    说道——
    “你最好会让我过去。”
    这并不是台词里有的话，不过你还能没琢磨出来这是几个意思，
    下一秒就先要“晕了过去”，无暇顾及了。`
    
            ],
    
            choices:[
    
                {
    
                    text:"继续",
    
                    next:"endingCheck"
                }
            ]
        },

    scene27:{

        bg:"assets/bg/安4.jpg",

        music:"assets/audio/轻快.mp3",

        speaker:"旁白",

        text:[

    `未完待续`

        ],

        choices:[

            {

                text:"继续",

                next:"endingCheck"
            }
        ]
    },

lowEnd:{

    bg:"assets/bg/首页.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"旁白",

    text:[

   `【普通结局】

   后来你们只是偶尔在学校见面，有时连招呼都来不及打。
   安乾镐依旧忙碌，而你也只是安稳地度过了自己的高中时代，
   一种事物还没萌芽便已死亡。
   那场短暂的交集好像不过一场summer camp。

   达成：
  《不要留在这个夏天》`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},
    
    
normalEnd1:{

    bg:"assets/bg/首页.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"系统",

    text:[

    `【普通结局】

    后来你们偶尔还会一起吃饭，
    但更多时候只是隔着走廊擦肩而过。
    你没有变成同性恋，你如愿以偿。
    却又总是在远远地看见他时，在他朝你笑起来的时候，
    觉得好像失去了什么。

    但那些痴缠爱怨都与你无关了。

    达成：
   《同学与朋友之间还相差几分》`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

normalEnd2:{

    bg:"assets/bg/首页.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"旁白",

    text:[

    `【普通结局】

    你们的关系好像变得更加亲密，
    但你总觉得还隔着一层壁障，
    它不会凭空消失，只会需要靠你自己去打破。

    有天安乾镐忽然问你：
    “我们现在是什么关系？”
    你没有回答。
    因为就连你自己也不知道，那会需要多久呢？

    达成：
   《难以言明》`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

normalEnd3:{

    bg:"assets/bg/首页.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"安乾镐",

    text:[

    `【普通结局】

    “我以后可以经常来找你吗？”
    现在安乾镐经常这样问你，
    好像迫切地想得到什么答案。
    而你尽管始终坚称自己是直男，
    却也逐渐开始容忍他越来越越界的举动。

    现在。
    你也不知道自己还能守住自己的初恋多少天了。

    但这感觉好像并不坏？

    达成：
   《潜移默化是很可怕的病》`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

normalEnd4:{

    bg:"assets/bg/首页.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"旁白",

    text:[

    `【普通结局】

    安乾镐以朋友的身份住进了你的家里，
    至少表面上如此风平浪静。

    但慢慢的，你却心知肚明，
    亲吻、拥抱、同床共枕，
    都已经不是朋友该拥有的范畴。

    他到底什么时候表白呢？
    你开始思考这个问题了
    却不知对方也是这么想的，呵呵。

    达成：
   《男朋友总想让我告白》`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},
    // 完美结局

perfectEnd:{

    bg:"assets/bg/安2.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"安乾镐",

    text:[

    `【完美结局】

    “好感值达标，不管怎么样你们都会走到一起。”
    
    未完待续`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

    // 崩坏结局

brokenEnd:{

    bg:"assets/bg/结局1.jpg",

    music:"assets/audio/噔噔噔.mp3",

    speaker:"系统",

    text:[

    `【崩坏结局】

    黑化值达标，有什么东西已经坏掉了。
    
    未完待续`


    ],

     choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

    // 隐藏结局

hiddenEnd:{

    bg:"assets/bg/结局1.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"？？？",

    text:[

    `【隐藏结局】

    爱恨自古两全，“你逃不掉的。”
    
    未完待续`

    ],

    choices:[

        {

            text:"重新开始",

            next:"home"
        }
    ]
},

    // 坏结局

bad1:{

    bg:"assets/bg/结局1.jpg",

    music:"assets/audio/轻快.mp3",

    speaker:"系统",

    text:[

    `【结局】
    你本想飞速避开，结果他因步伐不稳不小心撞到了你，

    你受到牵连，撞上了旁边的玻璃窗，长年失修的玻璃本就摇摇欲坠，不幸砸中了你们两个。
    啊oh...

    达成【只因当初相遇那么痛。】`

    ],

    choices:[

        {

            text:"返回首页",

            next:"home"
        }
    ]
    },
};

// ======================
// 结局检测
// ======================

// 按全路线选项累计约 favor 0~20、dark 0~15 设计
// 隐藏：好感与黑化双高（拉扯）
// 崩坏：黑化偏高且超过好感
// 完美：好感明显领先
// 普通（前区间）：normalEnd1 / normalEnd2 随机
// 普通（后区间）：normalEnd3 / normalEnd4 随机
// 其余 → lowEnd

function checkEnding(){

    const favor = state.favor;
    const dark = state.darkVal;

    if(favor >= 19 && dark >= 14){

        return "hiddenEnd";
    }

    if(dark >= 12 && dark > favor){

        return "brokenEnd";
    }

    if(favor >= 19 && favor >= dark + 3){

        return "perfectEnd";
    }

    if(
        favor >= 1 &&
        favor <= 4 &&
        dark <= 5
    ){
        return "normalEnd1";
    }

    if(
        favor >= 5 &&
        favor <= 8 &&
        dark <= 5
    ){
        return "normalEnd2";
    }

    if(
        favor >= 9 &&
        favor <= 12 &&
        dark <= 8
    ){
        return "normalEnd3";
    }

    if(
        favor >= 13 &&
        favor <= 14 &&
        dark <= 8
    ){
        return "normalEnd4";
    }

    return "lowEnd";
}


// ======================
// 渲染场景
// ======================

function renderScene(sceneID){

    if(sceneID === "endingCheck"){

        sceneID = checkEnding();
    }

    let scene =
    scenes[sceneID];

    if(!scene){

        console.error("未知场景:", sceneID);

        sceneID = "home";
        scene = scenes.home;
    }

    setHomeScene(sceneID === "home");

    // 切换背景

    background.style.backgroundImage =
    `url(${scene.bg})`;

    // 角色名

    speaker.innerText =
    scene.speaker;

    // 文本分页 + 打字机

    pendingChoices = scene.choices;

    prepareTextPages(scene.text);

    currentPageIndex = 0;

    showTextPage(0);

    
    // 音乐切换

if(
    !bgm.src.includes(
        encodeURI(scene.music)
    )
){

    bgm.src = scene.music;

    bgm.play();
}



// 清空选项

    choices.innerHTML = "";

    // 创建选项按钮

    scene.choices.forEach(choice=>{

        const button =
        document.createElement("button");

        // createElement：
        // 创建HTML元素

        button.className =
        "choice-btn";

        button.innerText =
        choice.text;

        button.onclick = ()=>{

            // 点击音效

            const click =
            new Audio(
            "assets/audio/click.mp3"
            );

            click.play();

            // effect：
            // 触发状态变化

            if(choice.effect){

                choice.effect();
            }

            renderScene(choice.next);
        };

        choices.appendChild(button);
    });
}

// ======================
// 启动游戏
// ======================

renderScene("home");