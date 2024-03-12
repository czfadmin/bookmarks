# Contributing Guide

在提交贡献之前，请花一些时间阅读以下内容，保证贡献是符合规范并且能帮助到项目。

## 一、Issue 报告指南

请遵循`Issue Template`的指引创建 Bug Report 或 Feature Request 类 Issues。

## 二、Pull Request 贡献指南

### 1. 环境准备

- VSCode >= 1.82.0
- Node.js >= 18.9.1 (推荐使用fnm工具管理 Node.js 版本)
- yarn

首先把 `bookmarks` 仓库 fork 一份到自己的 Github，然后从个人仓库把项目 clone 到本地，项目默认是 `main` 分支。

然后依次在项目根目录运行以下命令：

```bash
$ code /path/to/bookmarks
# 安装依赖
$ yarn
```

F5 进行调式

运行完上述命令后，环境已经准备好，此时可以新拉一条分支进行开发。

### 2. 开发与调试

拉取新分支,打开VSCode并进入到项目根目录, 按照Vscode官方开发调试指南进行开始调试项目代码.

### 3. 单元测试

暂未支持

### 4. 代码风格

- `JavaScript`：JavaScript 风格遵从 [JavaScript Standard Style](https://github.com/standard/standard)。
- `TypeScript`：TypeScript 风格也是 [JavaScript Standard Style](https://github.com/standard/standard) 的变种，详情请看相关包目录下的 `eslint.json` 和 `tsconfig.json`。
- 样式：遵循相关包目录下的 `.stylelintrc` 风格。

### 5. 提交 commit

> 遵从 [Angular Style Commit Message Conventions](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)，在输入 commit message 的时候请务必遵从此规范。

首先在项目中运行 `yarn change`, 生成改动日志(也可以留空白,不过尽量将本次提交的重点内容填写上去),
然后按照提交规范,进行提交改动

### 6. 提交 Pull Request

> 如果对 PR（Pull Request）不了解，请阅读 [《About Pull Requests》](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)

完成开发后，推送到自己的克隆的仓库，就可以准备提交 Pull Request 了。

提交 PR 前请阅读以下注意事项：

1. 保证 `yarn build` 能够编译成功。
2. 保证代码能通过 ESLint 测试。
3. 当相关包有测试用例时，请给你提交的代码也添加相应的测试用例；
4. 保证 commit 信息需要遵循 [Angular Style Commit Message Conventions](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)。
5. 如果提交到代码非常多或功能复杂，可以把 PR 分成几个 commit 一起提交。我们在合并时会会根据情况 squash。

### 7. 文档

暂未支持

####

## Credits

感谢以下所有给 Bookmark Manager 贡献过代码的开发者：

[contributors](https://github.com/czfadmin/bookmarks/graphs/contributors)

同时欢迎各位贡献者加入
