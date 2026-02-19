export default {
    system: {
        title: '⚙️ 服务器配置',
        enabled: '系统',
        dm_notifications: '私信通知',
        naming: '命名方案',
        auto_close: '自动关闭',
        transcript: '记录副本',
        max_tickets: '最大工单数',
        cooldown: '冷却时间',
        on: '开启',
        off: '关闭',
        yes: '是',
        no: '否',
        disabled: '已禁用',
        assigned: '已分配',
        not_set: '未设置'
    },
    nav: {
        placeholder: '📂 切换类别',
        system: '系统',
        system_desc: '常规设置和频道',
        types: '工单类型',
        types_desc: '类型和面板设计',
        security: '安全',
        security_desc: '角色、限制和黑名单',
        logs: '日志',
        logs_desc: '日志频道和记录副本设置'
    },
    buttons: {
        edit_naming: '命名方案',
        edit_limits: '编辑限制',
        blacklist: '黑名单',
        language: '语言',
        edit_general: '编辑常规信息',
        edit_welcome: '编辑欢迎消息'
    },
    placeholders: {
        category: '📂 默认工单类别',
        support_roles: '🛡️ 选择支持角色',
        admin_roles: '👑 选择管理员角色',
        log_channel: '📜 日志频道',
        send_panel: '📤 发送面板到频道...'
    },
    messages: {
        updated: '✅ {section} 设置已更新！',
        error: '❌ 无法更新配置。',
        only_owner: '只有服务器所有者可以配置机器人。',
        panel_sent: '✅ 面板已发送到 {channel}！',
        select_panel_channel: '❌ 请先选择一个面板频道！'
    },
    types: {
        panel_title: '面板标题',
        panel_desc: '面板描述',
        timestamp: '时间戳',
        header_types: '[类型]',
        header_texts: '[文本]',
        unified_panel: '🌐 统一主面板 (所有类型)',
        unified_desc: '发送带有选择菜单的集成面板',
        individual: '📨 单独: {type}',
        individual_desc: '发送 {type} 的单按钮面板'
    },
    security: {
        blacklist_count: '黑名单 ({count})'
    },
    logs: {
        audit_enabled: '审计: 开启',
        audit_disabled: '审计: 关闭',
        format: '格式: {format}'
    },

    modals: {
        edit_type: '编辑类型: {type}',
        edit_limits: '编辑限制',
        edit_texts: '编辑全局文本',
        edit_panel: '编辑统一面板',
        edit_welcome_msg: '编辑欢迎消息',
        add_type: '添加新工单类型'
    },
    ticket: {
        config_error: '配置错误。',
        invalid_type: '无效的工单类型。',
        open_title: '打开工单: {type}',
        default_desc: '描述你的问题',
        created: '✅ 工单创建成功: {channel}',
        create_failed: '❌ 工单创建失败: {error}'
    }
};


