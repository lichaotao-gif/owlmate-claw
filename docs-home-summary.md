# 主站首页实验摘要

首页通过现有 /review-holdings 只读桥接请求 owlmate:home-summary-request，返回 owlmate:home-summary-result。只提供实验 id、名称、策略名、保存状态、创建时间；不提供资金或交易内容。复用现有精确 origin、parent source、requestId 校验。storage 或实验变更时刷新摘要。保存状态不作为真实后台执行证明；本机记录尚未按账号隔离。

主站 /console/claw?experiment=ID 转发到实验室，存在的 ID 选择对应实验；不存在则保留默认行为。旧复盘持股协议保持兼容。
