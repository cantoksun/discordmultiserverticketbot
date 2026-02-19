export default {
    system: {
        title: '⚙️ server configuration',
        enabled: 'system',
        dm_notifications: 'dms',
        naming: 'naming scheme',
        auto_close: 'auto close',
        transcript: 'transcript',
        max_tickets: 'max tickets',
        cooldown: 'cooldown',
        on: 'on',
        off: 'off',
        yes: 'yes',
        no: 'no',
        disabled: 'disabled',
        assigned: 'assigned',
        not_set: 'not set'
    },
    nav: {
        placeholder: '📂 switch category',
        system: 'system',
        system_desc: 'general settings & channels',
        types: 'ticket types',
        types_desc: 'types & panel design',
        security: 'security',
        security_desc: 'roles, limits & blacklist',
        logs: 'logs',
        logs_desc: 'logs & transcripts'
    },
    buttons: {
        edit_naming: 'naming',
        edit_limits: 'edit limits',
        blacklist: 'blacklist',
        language: 'language',
        edit_general: 'edit general info',
        edit_welcome: 'edit welcome message'
    },

    placeholders: {
        category: '📂 default ticket category',
        support_roles: '🛡️ select support roles',
        admin_roles: '👑 select admin roles',
        log_channel: '📜 log channel',
        send_panel: '📤 send panel to channel...'
    },
    messages: {
        updated: '✅ updated {section} settings!',
        error: '❌ failed to update configuration.',
        only_owner: 'only the server owner can configure the bot.',
        panel_sent: '✅ panel sent to {channel}!',
        select_panel_channel: '❌ please select a panel channel first!'
    },
    types: {
        panel_title: 'panel title',
        panel_desc: 'panel desc',
        timestamp: 'timestamp',
        header_types: '[types]',
        header_texts: '[texts]',
        unified_panel: '🌐 unified main panel (all types)',
        unified_desc: 'sends the integrated select-menu panel',
        individual: '📨 individual: {type}',
        individual_desc: 'sends a single-button panel for {type}'
    },
    security: {
        blacklist_count: 'blacklist ({count})'
    },
    logs: {
        audit_enabled: 'audit: on',
        audit_disabled: 'audit: off',
        format: 'format: {format}'
    },

    modals: {
        edit_type: 'edit type: {type}',
        edit_limits: 'edit limits',
        edit_texts: 'edit global texts',
        edit_panel: 'edit unified panel',
        edit_welcome_msg: 'edit welcome message',
        add_type: 'add new ticket type'
    },
    ticket: {
        config_error: 'configuration error.',
        invalid_type: 'invalid ticket type.',
        open_title: 'open ticket: {type}',
        default_desc: 'describe your issue',
        created: '✅ ticket created successfully: {channel}',
        create_failed: '❌ failed to create ticket: {error}'
    }
};


