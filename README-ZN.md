# Bookmark Manager

- [英文](./README.md)

## 功能

- 单行书签切换
- 选中内容设置标签
- 自定义书签样式以及文本装饰器颜色
- 书签管理视图
- 快速跳转预览书签
- 自定义书签备注

### 预览

1.  侧边栏书签管理

![picture 2](images/fc6ebe2e592745e20ddc62cc1cad20917ac6716efa2c403736b8083d9812e90b.png)

2.  书签多颜色分类管理

![picture 1](images/454a86e976aac9448e305cc9942b13273a70e7cc89bec928f8e4234ed75411f2.png)

3. 对选中内容进行书签标记

![toggle-bookmark-with-selections](images/toggle-bookmark-with-selections.gif)

4. 快速预览书签并跳转到其位置

![quick-jump](./images/quick-jump.gif)

## 插件配置

- `bookmark-manager.alwaysUseDefaultColor`: 一直使用默认的颜色装饰书签图标
- `bookmark-manager.showGutterInOverviewRuler`: 是否在概览尺上显示`Gutter`图标.
- `bookmark-manager.showTextDecoration`: 设置是否显示书签的文本装饰器.
- `bookmark-manager.showGutterIcon`: 是否显示`gutter`图标.
- `bookmark-manager.fontWeight`: 书签字体样式.
- `bookmark-manager.colors`: 内置的颜色以及用户自定义书签颜色.
- `bookmark-manager.defaultBookmarkIconColor`: 设置默认的书签颜色.
- `bookmark-manager.showBorder`: 是否显示边框
- `bookmark-manager.border`: 书签的边框样式
- `bookmark-manager.showOutline`: 是否显示书签的轮廓
- `bookmark-manager.outline`: 书签的轮廓样式
- `bookmark-manager.wholeLine`: 是否选择整行,默认时选择有内容区域
- `bookmark-manager.textDecorationLine`: 自定义书签的装饰器样式
- `bookmark-manager.textDecorationStyle`: 自定义书签的装饰器样式
- `bookmark-manager.outlitextDecorationThicknessne`: 自定义装饰的粗细
- `bookmark-manager.lineBlame`: 开启书签的 `lineBlame`

## 其他

## 注意

当在对行或者选择的区域添加书签后,如果开启了 `bookmark-manager.showGutterIcon`, 会出现无法直接设置断点的情况, 不过可以通过使用右键行号进行创建, 更多详情[VSCode issus#5923](https://github.com/Microsoft/vscode/issues/5923)

**Enjoy!**
