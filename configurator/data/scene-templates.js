window.VAULT_SCENE_TEMPLATES = {
  "version": "2026-10-21-manual-audit-2",
  "title": "大场景 13 组 · 按图重建",
  "notice": "这是根据照片、原始 STL 尺寸和手册规则推算的可打印文件方案，不是作者原图 BOM。尺寸兼容检查不等于装配／承载／全部切片验证。混宽堆叠和改装配件先试装一组再批量打印。",
  "assumptions": [
    "由下向上、由左向右编号，单独统计外壳、抽屉盒与翻盖箱。",
    "L＝2S；XL＝S＋M，来自使用说明第8页。本方案双列 S 使用标准独立 S 外壳，避免猜测 L² 配套滑轨结构；外观会出现中间接缝。",
    "深度 3／4／5／7 是根据场景用途合理选定，不是从透视图精确测量出的结果。",
    "内部不可见：不额外添加收纳格、隔板或 Gridfinity 底板；需要时从全部模型图库选用。",
    "每个 STL 文件保存一次，打印份数由清单给出。文件已含一对滑轨、弹簧或连杆的，1份文件即一对。",
    "多抽屉共用外壳时，默认包含作者建议的可选齿条；可在导出前关闭。一份 Rails 含两条，每只抽屉按2份文件计。",
    "Jig是用后取走的装配工装；模型自带支撑、单独手动支撑和切片自动支撑不是同一类零件。",
    "共用顶盖、提手按柜计；翻盖箱自身的铰链顶盖仍按每箱计。堆叠搭扣、壁挂定位与背部骨架份数为装配估算。",
    "大规格整体原始 STL 可能超出 P1S。文件包不缩放模型，不代表所有零件都能在 256mm 平台一次打印。"
  ],
  "groups": [
    {
      "id": "A01",
      "name": "桌面左侧混合抽屉柜",
      "why": "图中可辨认下方大抽屉、三层双列 S 与两层全宽抽屉；总面板高度约 10F。深度按桌面浅柜选 3。",
      "depth": 3,
      "width": "L",
      "roof": "table",
      "counts": {
        "drawers": 9,
        "modules": 9,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/03. L Families/L3/Modules/L3 Module 4F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0139"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Boxes/L3 Box 4F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0136"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L4F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0196"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 9,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 9,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 9,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 9,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 24,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 9,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 9,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 18,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Modules/L3 Module 1F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0137"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Boxes/L3 Box 1F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0134"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 1F.stl",
          "q": 4,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0006"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 4,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 4,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0007"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0004"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Roofs/L3 Table Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0140"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 20,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A02",
      "name": "桌面中间抽屉与翻盖混合柜",
      "why": "上方两层黑色搭锁按 1F 与 2F 翻盖箱解释，下方按双列 S 与全宽 L 抽屉混合。深度统一为 3。",
      "depth": 3,
      "width": "L",
      "roof": null,
      "counts": {
        "drawers": 7,
        "modules": 9,
        "cases": 2
      },
      "items": [
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 1F.stl",
          "q": 4,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0006"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 4,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 4,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 7,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 7,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 7,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 7,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 18,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 7,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 7,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 14,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Modules/L3 Module 1F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0137"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Boxes/L3 Box 1F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0134"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0007"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0004"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L3/Modules/L3 1F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0459"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L3/Roofs/L3 Roof.stl",
          "q": 2,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0467"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L1F Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0514"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL Hinge Top.stl",
          "q": 4,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0571"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL 1F Hinge.stl",
          "q": 2,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0570"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/L-XL Rods.stl",
          "q": 2,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0567"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK HOLDER.stl",
          "q": 4,
          "part": "lockholder",
          "partName": "锁座",
          "color": 2,
          "support": false,
          "ref": "m0580"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK INNER PART.stl",
          "q": 4,
          "part": "lockinner",
          "partName": "锁具内部件",
          "color": 2,
          "support": false,
          "ref": "m0577"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 1F.stl",
          "q": 2,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0578"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/1 SET OF PINS FOR 1 LOCK.stl",
          "q": 4,
          "part": "pins",
          "partName": "锁具插销",
          "color": 3,
          "support": false,
          "ref": "m0576"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Label for Sustainers.stl",
          "q": 4,
          "part": "caselabel",
          "partName": "储物箱标签",
          "color": 1,
          "support": false,
          "ref": "m0544"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L3/Modules/L3 2F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0462"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L2F Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0515"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L 2-4F Hinge.stl",
          "q": 2,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0569"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 2-4F.stl",
          "q": 2,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0579"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 18,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A03",
      "name": "桌面右侧窄抽屉柜",
      "why": "六个可辨认的小抽屉面板，采用 S3 的 4F 外壳加 2F 外壳，共六个 1F 抽屉；外壳分段为重建选择。",
      "depth": 3,
      "width": "S",
      "roof": "table",
      "counts": {
        "drawers": 6,
        "modules": 2,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 4f.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0008"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 6,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 6,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 6,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 6,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 6,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 6,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 12,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 6,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 6,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 12,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/S Rails.stl",
          "q": 12,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0398"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 2F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0007"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Roofs/S3 Table Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0009"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 4,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A04",
      "name": "左侧桌下落地混合柜",
      "why": "由下向上为 2F 大抽屉、4F 大抽屉、双 S2F、2F 翻盖箱、1F 抽屉；顶部黑色凹面按托盘顶盖重建。深度选 4。",
      "depth": 4,
      "width": "L",
      "roof": "bowl",
      "counts": {
        "drawers": 5,
        "modules": 6,
        "cases": 1
      },
      "items": [
        {
          "p": "01. DRAWERS/03. L Families/L4/Modules/L4 Module 2F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0151"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Boxes/L4 Box 2F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0148"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L2F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0195"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Guides.stl",
          "q": 5,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0287"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Slides.stl",
          "q": 5,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0288"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 5,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 5,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 18,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 5,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 5,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 10,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Modules/L4 Module 4F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0152"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Boxes/L4 Box 4F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0149"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L4F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0196"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Modules/S4 Module 2f.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0020"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Boxes/S4 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0017"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L4/Modules/L4 2F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0472"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L4/Roof/L4 Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0477"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L2F Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0515"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL Hinge Top.stl",
          "q": 2,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0571"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L 2-4F Hinge.stl",
          "q": 2,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0569"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/L-XL Rods.stl",
          "q": 1,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0567"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK HOLDER.stl",
          "q": 2,
          "part": "lockholder",
          "partName": "锁座",
          "color": 2,
          "support": false,
          "ref": "m0580"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK INNER PART.stl",
          "q": 2,
          "part": "lockinner",
          "partName": "锁具内部件",
          "color": 2,
          "support": false,
          "ref": "m0577"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 2-4F.stl",
          "q": 2,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0579"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/1 SET OF PINS FOR 1 LOCK.stl",
          "q": 2,
          "part": "pins",
          "partName": "锁具插销",
          "color": 3,
          "support": false,
          "ref": "m0576"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Label for Sustainers.stl",
          "q": 2,
          "part": "caselabel",
          "partName": "储物箱标签",
          "color": 1,
          "support": false,
          "ref": "m0544"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Modules/L4 Module 1F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0150"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Boxes/L4 Box 1F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0147"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Roofs/L4 Bowl Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0154"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 14,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A05",
      "name": "左侧桌下宽抽屉柜",
      "why": "约十个等高全宽抽屉，面板宽高比最接近 XL。现有 XL 文件只有 1F，故用十个 XL5 1F 外壳，不虚构 XL4F。深度 5 为合理选定。",
      "depth": 5,
      "width": "XL",
      "roof": "bowl",
      "counts": {
        "drawers": 10,
        "modules": 10,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/05. XL Families/XL5/Modules/XL5 Module 1F.stl",
          "q": 10,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0234"
        },
        {
          "p": "01. DRAWERS/05. XL Families/XL5/Boxes/XL5 Box 1F.stl",
          "q": 10,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0232"
        },
        {
          "p": "01. DRAWERS/05. XL Families/XL Facade 1F.stl",
          "q": 10,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0212"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x5 Runner Guides.stl",
          "q": 10,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0289"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x5 Runner Slides.stl",
          "q": 10,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0290"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 10,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 10,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 20,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 10,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 10,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 20,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/05. XL Families/XL5/Boxes/XL5 Back Panel.stl",
          "q": 10,
          "part": "backpanel",
          "partName": "XL 抽屉背板",
          "color": 1,
          "support": false,
          "ref": "m0233"
        },
        {
          "p": "01. DRAWERS/05. XL Families/XL5/Roofs/XL5 Bowl Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0236"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 20,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A06",
      "name": "便携区左侧带提手混合柜",
      "why": "下方 4F 翻盖箱，中间左四个 1F／右两个 2F 抽屉，上方 2F 翻盖箱与双 S1F；单个 L 网格顶盖承载顶部提手。深度选 4。",
      "depth": 4,
      "width": "L",
      "roof": "grid",
      "counts": {
        "drawers": 8,
        "modules": 6,
        "cases": 2
      },
      "items": [
        {
          "p": "02. SUSTAINERS/03. L Families/L4/Modules/L4 4F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0475"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L4/Roof/L4 Roof.stl",
          "q": 2,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0477"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L4F' Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0516"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL Hinge Top.stl",
          "q": 4,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0571"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L 2-4F Hinge.stl",
          "q": 4,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0569"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/L-XL Rods.stl",
          "q": 2,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0567"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK HOLDER.stl",
          "q": 4,
          "part": "lockholder",
          "partName": "锁座",
          "color": 2,
          "support": false,
          "ref": "m0580"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK INNER PART.stl",
          "q": 4,
          "part": "lockinner",
          "partName": "锁具内部件",
          "color": 2,
          "support": false,
          "ref": "m0577"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 2-4F.stl",
          "q": 4,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0579"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/1 SET OF PINS FOR 1 LOCK.stl",
          "q": 4,
          "part": "pins",
          "partName": "锁具插销",
          "color": 3,
          "support": false,
          "ref": "m0576"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Label for Sustainers.stl",
          "q": 4,
          "part": "caselabel",
          "partName": "储物箱标签",
          "color": 1,
          "support": false,
          "ref": "m0544"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Modules/S4 Module 4F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0021"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Boxes/S4 Box 1F.stl",
          "q": 6,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0016"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 6,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Guides.stl",
          "q": 8,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0287"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Slides.stl",
          "q": 8,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0288"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 8,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 8,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 20,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 8,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 8,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 16,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/S Rails.stl",
          "q": 12,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0398"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Boxes/S4 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0017"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L4/Modules/L4 2F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0472"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L2F Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0515"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Modules/S4 Module 1f.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0019"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Roofs/L4 Grid Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0157"
        },
        {
          "p": "01. DRAWERS/07. Universal/Top Handle (Turn On Supports).stl",
          "q": 1,
          "part": "handle",
          "partName": "顶部提手",
          "color": 2,
          "support": true,
          "ref": "m0395"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 14,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A07",
      "name": "便携区中间小提手柜",
      "why": "从图中识别一只 2F 和一只 1F 抽屉；采用 S3，顶部为带提手网格顶盖。",
      "depth": 3,
      "width": "S",
      "roof": "grid",
      "counts": {
        "drawers": 2,
        "modules": 2,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 2F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0007"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 2F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0004"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 2,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 2,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 2,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 2,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 6,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 2,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 2,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 4,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 1F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0006"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 1,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Roofs/S3 Grid Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0012"
        },
        {
          "p": "01. DRAWERS/07. Universal/Top Handle (Turn On Supports).stl",
          "q": 1,
          "part": "handle",
          "partName": "顶部提手",
          "color": 2,
          "support": true,
          "ref": "m0395"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 4,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A08",
      "name": "便携区右侧三层翻盖箱",
      "why": "三层均有成对黑色搭锁，按三个 L3 1F 翻盖箱重建；上方凹形结构选 L3 托盘顶盖。内部结构不可见，统一选平底箱体。",
      "depth": 3,
      "width": "L",
      "roof": "bowl",
      "counts": {
        "drawers": 0,
        "modules": 3,
        "cases": 3
      },
      "items": [
        {
          "p": "02. SUSTAINERS/03. L Families/L3/Modules/L3 1F Flat Module.stl",
          "q": 3,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0459"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L3/Roofs/L3 Roof.stl",
          "q": 3,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0467"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L1F Facade.stl",
          "q": 3,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0514"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL Hinge Top.stl",
          "q": 6,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0571"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL 1F Hinge.stl",
          "q": 6,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0570"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/L-XL Rods.stl",
          "q": 3,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0567"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK HOLDER.stl",
          "q": 6,
          "part": "lockholder",
          "partName": "锁座",
          "color": 2,
          "support": false,
          "ref": "m0580"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK INNER PART.stl",
          "q": 6,
          "part": "lockinner",
          "partName": "锁具内部件",
          "color": 2,
          "support": false,
          "ref": "m0577"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 1F.stl",
          "q": 6,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0578"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/1 SET OF PINS FOR 1 LOCK.stl",
          "q": 6,
          "part": "pins",
          "partName": "锁具插销",
          "color": 3,
          "support": false,
          "ref": "m0576"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Label for Sustainers.stl",
          "q": 6,
          "part": "caselabel",
          "partName": "储物箱标签",
          "color": 1,
          "support": false,
          "ref": "m0544"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Roofs/L3 Bowl Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0141"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 6,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A09",
      "name": "伸缩拉手与大轮移动柜",
      "why": "按双 S4F、大／小抽屉混搭重建；依据改装手册，底座上和顶盖下采用 2F 外壳。最下面一层图中不清晰，以两只 1F 抽屉补足底部 2F，属明确推测。深柜选 7。",
      "depth": 7,
      "width": "L",
      "roof": "table",
      "counts": {
        "drawers": 11,
        "modules": 9,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/03. L Families/L7/Modules/L7 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0187"
        },
        {
          "p": "01. DRAWERS/03. L Families/L7/Boxes/L7 Box 1F.stl",
          "q": 5,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0183"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 5,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x7 Runner Guides.stl",
          "q": 11,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0293"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x7 Runner Slides.stl",
          "q": 11,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0294"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 11,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 11,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 30,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 11,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 11,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 22,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/L Rails.stl",
          "q": 8,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0396"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 4F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0060"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 4F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0057"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S4F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0067"
        },
        {
          "p": "01. DRAWERS/03. L Families/L7/Modules/L7 Module 1F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0186"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 1F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0058"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 1F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0055"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0059"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0056"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/03. L Families/L7/Roofs/L7 Table Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0189"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 22,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        },
        {
          "p": "03. MODIFICATIONS/Base/L/L7 Base Whole.stl",
          "q": 1,
          "part": "base",
          "partName": "底座",
          "color": 1,
          "support": false,
          "ref": "m0650"
        },
        {
          "p": "03. MODIFICATIONS/Feet/L Feet.stl",
          "q": 1,
          "part": "feet",
          "partName": "支脚",
          "color": 1,
          "support": false,
          "ref": "m0681"
        },
        {
          "p": "03. MODIFICATIONS/Wheels/Tyre (TPU).stl",
          "q": 2,
          "part": "tyre",
          "partName": "TPU 轮胎",
          "color": 1,
          "support": false,
          "ref": "m0721"
        },
        {
          "p": "03. MODIFICATIONS/Wheels/Disk.stl",
          "q": 2,
          "part": "disk",
          "partName": "轮盘",
          "color": 1,
          "support": false,
          "ref": "m0720"
        },
        {
          "p": "03. MODIFICATIONS/Wheels/Cover.stl",
          "q": 2,
          "part": "cover",
          "partName": "轮盖",
          "color": 1,
          "support": false,
          "ref": "m0718"
        },
        {
          "p": "03. MODIFICATIONS/Wheels/Bushing.stl",
          "q": 2,
          "part": "bushing",
          "partName": "轴套",
          "color": 1,
          "support": false,
          "ref": "m0722"
        },
        {
          "p": "03. MODIFICATIONS/Wheels/Jig.stl",
          "q": 1,
          "part": "jig",
          "partName": "装配定位夹具",
          "color": 1,
          "support": false,
          "ref": "m0719"
        },
        {
          "p": "03. MODIFICATIONS/Pull-out Handle/L Pull-out Handle.stl",
          "q": 1,
          "part": "pullhandle",
          "partName": "伸缩拉手",
          "color": 1,
          "support": false,
          "ref": "m0625"
        },
        {
          "p": "03. MODIFICATIONS/Backbone/L Pull-out Handle Lock.stl",
          "q": 1,
          "part": "handlelock",
          "partName": "伸缩拉手锁扣",
          "color": 1,
          "support": false,
          "ref": "m0699"
        },
        {
          "p": "03. MODIFICATIONS/Backbone/Handle Lock Knob Part 1.stl",
          "q": 2,
          "part": "knob",
          "partName": "锁扣旋钮",
          "color": 1,
          "support": false,
          "ref": "m0711"
        },
        {
          "p": "03. MODIFICATIONS/Backbone/Handle Lock Knob Part 2.stl",
          "q": 2,
          "part": "knob",
          "partName": "锁扣旋钮",
          "color": 1,
          "support": false,
          "ref": "m0712"
        },
        {
          "p": "03. MODIFICATIONS/Backbone/L1F Backbone.stl",
          "q": 2,
          "part": "backbone",
          "partName": "背部骨架",
          "color": 1,
          "support": false,
          "ref": "m0700"
        },
        {
          "p": "03. MODIFICATIONS/Backbone/L2F Backbone.stl",
          "q": 5,
          "part": "backbone",
          "partName": "背部骨架",
          "color": 1,
          "support": false,
          "ref": "m0701"
        }
      ]
    },
    {
      "id": "A10",
      "name": "四脚轮高层混合柜",
      "why": "图中上方双列翻盖箱、下方双列大抽屉和多层薄抽屉；底部两层薄抽屉共用 2F 外壳。统一选 L7／S7，以翻转底座配四个外购脚轮。",
      "depth": 7,
      "width": "L",
      "roof": null,
      "counts": {
        "drawers": 12,
        "modules": 13,
        "cases": 3
      },
      "items": [
        {
          "p": "01. DRAWERS/03. L Families/L7/Modules/L7 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0187"
        },
        {
          "p": "01. DRAWERS/03. L Families/L7/Boxes/L7 Box 1F.stl",
          "q": 6,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0183"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 6,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x7 Runner Guides.stl",
          "q": 12,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0293"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x7 Runner Slides.stl",
          "q": 12,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0294"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 12,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 12,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 32,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 12,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 12,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 24,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/L Rails.stl",
          "q": 8,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0396"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 4F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0060"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 4F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0057"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S4F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0067"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0059"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0056"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/03. L Families/L7/Modules/L7 Module 1F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0186"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Modules/S7 Module 1F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0058"
        },
        {
          "p": "01. DRAWERS/01. S Families/S7/Boxes/S7 Box 1F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0055"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "02. SUSTAINERS/01. S Families/S7/Modules/S7 4F Module.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0421"
        },
        {
          "p": "02. SUSTAINERS/01. S Families/S7/Roof/S7 Roof Whole.stl",
          "q": 2,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0422"
        },
        {
          "p": "02. SUSTAINERS/01. S Families/Facades/S4F Facade.stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0428"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/S Hinge Top.stl",
          "q": 4,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0573"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/S-M 2-4F Hinge.stl",
          "q": 4,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0575"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/S-M Rods.stl",
          "q": 2,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0568"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK HOLDER.stl",
          "q": 4,
          "part": "lockholder",
          "partName": "锁座",
          "color": 2,
          "support": false,
          "ref": "m0580"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK INNER PART.stl",
          "q": 4,
          "part": "lockinner",
          "partName": "锁具内部件",
          "color": 2,
          "support": false,
          "ref": "m0577"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 2-4F.stl",
          "q": 2,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0579"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/1 SET OF PINS FOR 1 LOCK.stl",
          "q": 4,
          "part": "pins",
          "partName": "锁具插销",
          "color": 3,
          "support": false,
          "ref": "m0576"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Label for Sustainers.stl",
          "q": 4,
          "part": "caselabel",
          "partName": "储物箱标签",
          "color": 1,
          "support": false,
          "ref": "m0544"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L7/Modules/L7 1F Flat Module.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0502"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/L7/Roofs/L7 Roof Whole.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0510"
        },
        {
          "p": "02. SUSTAINERS/03. L Families/Facades/L1F Facade.stl",
          "q": 1,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": false,
          "ref": "m0514"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL Hinge Top.stl",
          "q": 2,
          "part": "hingetop",
          "partName": "上部铰链",
          "color": 2,
          "support": false,
          "ref": "m0571"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Hinges/L-XL 1F Hinge.stl",
          "q": 2,
          "part": "hinge",
          "partName": "连接铰链",
          "color": 2,
          "support": false,
          "ref": "m0570"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Rods/L-XL Rods.stl",
          "q": 1,
          "part": "rods",
          "partName": "铰链连杆",
          "color": 3,
          "support": false,
          "ref": "m0567"
        },
        {
          "p": "02. SUSTAINERS/05. Universal/Locks/LOCK OUTER PART 1F.stl",
          "q": 2,
          "part": "lockouter",
          "partName": "锁具外部件",
          "color": 2,
          "support": false,
          "ref": "m0578"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 28,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        },
        {
          "p": "03. MODIFICATIONS/Base/L/L7 Base Whole.stl",
          "q": 1,
          "part": "base",
          "partName": "底座",
          "color": 1,
          "support": false,
          "ref": "m0650"
        }
      ]
    },
    {
      "id": "A11",
      "name": "壁挂多列抽屉组合",
      "why": "顶层两只 L4F，第二层 S2F＋L2F＋S2F，中间四列各四个 S1F，底层两只 L2F；总宽度 2L＝4S。采用浅深度 3，独立外壳分别壁挂。",
      "depth": 3,
      "width": "2L",
      "roof": "table",
      "counts": {
        "drawers": 23,
        "modules": 11,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/03. L Families/L3/Modules/L3 Module 2F.stl",
          "q": 3,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0138"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Boxes/L3 Box 2F.stl",
          "q": 3,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0135"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L2F (Turn On Supports).stl",
          "q": 3,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0195"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 23,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 23,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 23,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 23,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 60,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 23,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 23,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 46,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "03. MODIFICATIONS/Wall Mounts/L2F Wall Mount.stl",
          "q": 3,
          "part": "wall",
          "partName": "壁挂安装件",
          "color": 1,
          "support": false,
          "ref": "m0634"
        },
        {
          "p": "03. MODIFICATIONS/Wall Mounts/Wall Mount Second Part.stl",
          "q": 11,
          "part": "wall",
          "partName": "壁挂安装件",
          "color": 1,
          "support": false,
          "ref": "m0643"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 4f.stl",
          "q": 4,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0008"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 16,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 16,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/S Rails.stl",
          "q": 32,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0398"
        },
        {
          "p": "03. MODIFICATIONS/Wall Mounts/S4F Wall Mount.stl",
          "q": 4,
          "part": "wall",
          "partName": "壁挂安装件",
          "color": 1,
          "support": false,
          "ref": "m0641"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 2F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0007"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0004"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "03. MODIFICATIONS/Wall Mounts/S2F Wall Mount.stl",
          "q": 2,
          "part": "wall",
          "partName": "壁挂安装件",
          "color": 1,
          "support": false,
          "ref": "m0640"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Modules/L3 Module 4F.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0139"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Boxes/L3 Box 4F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0136"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L4F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0196"
        },
        {
          "p": "03. MODIFICATIONS/Wall Mounts/L4F Wall Mount.stl",
          "q": 2,
          "part": "wall",
          "partName": "壁挂安装件",
          "color": 1,
          "support": false,
          "ref": "m0635"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Roofs/L3 Table Roof.stl",
          "q": 2,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0140"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 26,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A12",
      "name": "右侧桌下左悬挂柜",
      "why": "下方两只 S2F，上方三只 L1F；三只薄抽屉采用一个 L2F 外壳加一个 L1F 外壳。顶部专用桌下安装顶盖，深度选 4。",
      "depth": 4,
      "width": "L",
      "roof": "under table",
      "counts": {
        "drawers": 5,
        "modules": 4,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/01. S Families/S4/Modules/S4 Module 2f.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0020"
        },
        {
          "p": "01. DRAWERS/01. S Families/S4/Boxes/S4 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0017"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Guides.stl",
          "q": 5,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0287"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x4 Runner Slides.stl",
          "q": 5,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0288"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 5,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 5,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 14,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 5,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 5,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 10,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Modules/L4 Module 1F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0150"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Boxes/L4 Box 1F.stl",
          "q": 3,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0147"
        },
        {
          "p": "01. DRAWERS/03. L Families/Facades/L1F (Turn On Supports).stl",
          "q": 3,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0194"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Modules/L4 Module 2F.stl",
          "q": 1,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0151"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/L Rails.stl",
          "q": 4,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0396"
        },
        {
          "p": "01. DRAWERS/03. L Families/L4/Roofs/L4 Under Table Mount Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0156"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 8,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    },
    {
      "id": "A13",
      "name": "右侧桌下右悬挂柜",
      "why": "左列四只 S1F，右列两只 S2F，共用相同 4F 高度；采用两只标准 S3 4F 外壳并排，上方为 L3 桌下安装顶盖。",
      "depth": 3,
      "width": "L",
      "roof": "under table",
      "counts": {
        "drawers": 6,
        "modules": 2,
        "cases": 0
      },
      "items": [
        {
          "p": "01. DRAWERS/01. S Families/S3/Modules/S3 Module 4f.stl",
          "q": 2,
          "part": "module",
          "partName": "箱体模块",
          "color": 1,
          "support": false,
          "ref": "m0008"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 1F.stl",
          "q": 4,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0003"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S1F (Turn On Supports).stl",
          "q": 4,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0065"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Guides.stl",
          "q": 6,
          "part": "guides",
          "partName": "滑轨导向件",
          "color": 1,
          "support": false,
          "ref": "m0285"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/x3 Runner Slides.stl",
          "q": 6,
          "part": "slides",
          "partName": "滑轨滑动件",
          "color": 2,
          "support": false,
          "ref": "m0286"
        },
        {
          "p": "01. DRAWERS/07. Universal/Springs.stl",
          "q": 6,
          "part": "springs",
          "partName": "弹簧",
          "color": 3,
          "support": false,
          "ref": "m0275"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key (Turn On Supports).stl",
          "q": 6,
          "part": "lock",
          "partName": "旋转钥匙锁",
          "color": 2,
          "support": true,
          "ref": "m0390"
        },
        {
          "p": "01. DRAWERS/07. Universal/Facade Cap.stl",
          "q": 16,
          "part": "facadecap",
          "partName": "面板盖",
          "color": 1,
          "support": false,
          "ref": "m0394"
        },
        {
          "p": "01. DRAWERS/07. Universal/Key Cap.stl",
          "q": 6,
          "part": "keycap",
          "partName": "钥匙盖",
          "color": 1,
          "support": false,
          "ref": "m0391"
        },
        {
          "p": "01. DRAWERS/07. Universal/Label.stl",
          "q": 6,
          "part": "label",
          "partName": "标签",
          "color": 1,
          "support": false,
          "ref": "m0284"
        },
        {
          "p": "01. DRAWERS/07. Universal/Runners/Runner Stopper.stl",
          "q": 12,
          "part": "stopper",
          "partName": "滑轨限位件",
          "color": 3,
          "support": false,
          "ref": "m0305"
        },
        {
          "p": "01. DRAWERS/07. Universal/Geared Rails/S Rails.stl",
          "q": 12,
          "part": "rails",
          "partName": "齿形导轨",
          "color": 3,
          "support": false,
          "ref": "m0398"
        },
        {
          "p": "01. DRAWERS/01. S Families/S3/Boxes/S3 Box 2F.stl",
          "q": 2,
          "part": "box",
          "partName": "抽屉盒",
          "color": 2,
          "support": false,
          "ref": "m0004"
        },
        {
          "p": "01. DRAWERS/01. S Families/Facades/S2F (Turn On Supports).stl",
          "q": 2,
          "part": "facade",
          "partName": "前面板",
          "color": 1,
          "support": true,
          "ref": "m0066"
        },
        {
          "p": "01. DRAWERS/03. L Families/L3/Roofs/L3 Under Table Mount Roof.stl",
          "q": 1,
          "part": "roof",
          "partName": "翻盖顶盖",
          "color": 1,
          "support": false,
          "ref": "m0143"
        },
        {
          "p": "01. DRAWERS/07. Universal/Latch.stl",
          "q": 2,
          "part": "latch",
          "partName": "搭扣",
          "color": 3,
          "support": false,
          "ref": "m0283"
        }
      ]
    }
  ]
};
