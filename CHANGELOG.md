# Change Log

## 0.0.35

### Patch Changes

- 6cc2de6: fix(textDecoration): 修改配置中的showTextDecoratin选项的默认值

## 0.0.34

### Patch Changes

- 支持自定义分组排序功能

## 0.0.33

### Patch Changes

- 修复书签移动时出现装饰器位置异常问题

## 0.0.32

### Patch Changes

- 0d606d1: 增加Walkthrough

## 0.0.30

### Patch Changes

- 新增书签分组功能
- 新增支持上下文改变书签分组命令
- 支持分组拖拽,以及分组级别拖拽排序
- 新增支持从控制命令板中快速列出已选择的分组中的书签列表命令
- 新增支持按照颜色清除所选组下的书签命令
- 新增设置默认激活组命令

## 0.0.29

### Patch Changes

- 使用swc-loader提升编译速度

## 0.0.28

### Patch Changes

- 954e0ef: 增加mst, 使用mobx改造BookmarkController
- 2db8f88: feat:使用mst改造插件配置
- feat:优化BookmarkController代码,同时修复上次提交产生的BUG

## 0.0.27

### Patch Changes

- fix:修复多个工作区间书签保存到bookmark-manager.json失败问题

## 0.0.26

### Patch Changes

- c43f594: 增加`alwaysIgnore`选项配置是否将`bookmark-manager.json`文件添加到`.gitignore`文件中
- c43f594: 修复清除所有书签时TreeView的Badge未更新BUG
- c43f594: 增加在单行书签进行编辑是否开启自动转换为多行书签,配置项为`autoSwitchSingleToMultiWhenLineWrapping`,默认为 true`

## 0.0.25

### Patch Changes

- 修复修改颜色名字，编辑器没有图标的问题;
- 增加Issue模板

## 0.0.24

### Patch Changes

- 修改存储文件为 bookmark-manager.json,避免跟其他插件文件名冲突
- 增加改变颜色名字功能

## 0.0.23

### Patch Changes

- a60fe7a: 移除不必要资源, 增加是否使用内置颜色分类配置选项
- 7905947: 代码优化,修复BUG
- bd6fb22: 增加对工作区间分组
- 4f7f8b8: 代码优化, 配置改变时, 修复带有标签样式的发生切换效果失败BUG

## 0.0.22

### Patch Changes

- 代码书签为颜色视图时, 支持书签分组拖拽

## 0.0.21

### Patch Changes

- 修复无法正常开启/关闭书签问题

## 0.0.20

### Patch Changes

- BUG修复

## 0.0.19

### Patch Changes

- 修复BUG以及增加按照颜色排序功能

## 0.0.18

### Patch Changes

- 代码重构,增加通用书签功能

## 0.0.16

### Patch Changes

- d92eeed: 支持命令列出当前文件的书签
- 98cf475:
  - 书签支持行号排序
  - 增加中英文切换
  - 优化`Statusbar`显示信息
  - 支持单击书签跳转到文件位置并高亮书签
  - 增加书签所在文件列表大纲 6. 优化书签悬浮提示信息, 并显示代码行号
- a36aeb2:
  - 当未进行选择文本时,隐藏命令面板中`toggleBookmarkWithSelection`命令;
  - 增加代码注释以及代码优化`

## 0.0.15

### Patch Changes

- 3134833: 增加statusbar

## 0.0.14

### Patch Changes

- 3b116b0: 调整书签展示信息-显示行信息
- 149ed8c: 修复lineBlame显示错乱

## 0.0.13

### Patch Changes

- c4e2889: 增加国际化

## 0.0.12

### Patch Changes

- d52af95: 更新 README.md,以及增加插件别名
- 040575e: 增加文件改动或删除监听事件处理已存在的书签数据

## 0.0.11

### Patch Changes

- 93c28c5: 修复在 TreeView 中清除书签时,打开的编辑器书签清除失败问题, 同时增加 prettier 等开发依赖

## 0.0.10

### Patch Changes

- 增加有标签和无标签区分图标差异
- 4ee1ae8: 活动栏视图增加数量 badge

## 0.0.9

### Patch Changes

- 书签列表视图支持相对路径展示

## 0.0.8

### Patch Changes

- 修改插件图标

## 0.0.7

### Patch Changes

- 2b99062: 代码优化,改善从命令面板和上下文菜单中操作书签的交互

## 0.0.6

### Patch Changes

- 更改插件名称为`bookmark-manager`

## 0.0.5

### Patch Changes

- 更新说明文档

## 0.0.4

### Patch Changes

- 85d292c: add license.md
- 6e8e436: update package.json
- 代码优化,增加 lineBlame 功能

## 0.0.3

### Patch Changes

- 完善书签功能以及增加自定义书签配置
- 691291e: 提交代码,代码优化
- b903f15: 修复编辑书签标签失败问题
- 71bca49: 代码优化

## 0.0.2

### Patch Changes

- 增加 changeset 工具

All notable changes to the "bookmarks" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release
