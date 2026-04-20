给我开发一个openclaw的管理器，根据资料设计功能和好用的界面，先生成计划和设计写入文档，然后按计划一直开发测试直到所有目标达成，在每个功能开发完后，都用git建立一个commit，最后使用gh提交到一个公共的仓库，我已经gh认证了。
中间不必向我询问。

## openclaw管理器
查看~/.openclaw/openclaw.json, 设计openclaw的管理ui web
先下载https://news-openclaw.smzdm.com/docs/zh-CN/gateway/configuration这一页到markdown文件，这个是配置的描述
再下载https://news-openclaw.smzdm.com/docs/zh-CN/gateway/configuration-examples 这个是配置示例
https://news-openclaw.smzdm.com/docs/zh-CN/tools/agent-send 这个是agent工具，用于测试是否可用
https://news-openclaw.smzdm.com/docs/zh-CN/start/getting-started 入门，可以看看怎么启动，状态等，如openclaw gateway --port 18789 --verbose启动openclaw gateway
大概有如下功能：
1. 支持openclaw gateway 启动，停止，重启
2. 支持修改模型，可以选择ollama，选择ollama自动列出可选模型
3. 支持新建agent, 测试agent，支持创建skill
4. 支持备份恢复~/.openclaw
5. 其他必要的好用的管理功能，你看着办
   