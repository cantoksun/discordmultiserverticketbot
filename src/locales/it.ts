export default {
    system: {
        title: '⚙️ Configurazione Server',
        enabled: 'Sistema',
        dm_notifications: 'Notifiche DM',
        naming: 'Schema di Denominazione',
        auto_close: 'Chiusura Auto',
        transcript: 'Trascrizione',
        max_tickets: 'Max Ticket',
        cooldown: 'Raffreddamento',
        on: 'ON',
        off: 'OFF',
        yes: 'SÌ',
        no: 'NO',
        disabled: 'DISABILITATO',
        assigned: 'Assegnato',
        not_set: 'NON IMPOSTATO'
    },
    nav: {
        placeholder: '📂 Cambia Categoria',
        system: 'Sistema',
        system_desc: 'Impostazioni Generali & Canali',
        types: 'Tipi di Ticket',
        types_desc: 'Tipi & Design Pannello',
        security: 'Sicurezza',
        security_desc: 'Ruoli, Limiti & Blacklist',
        logs: 'Log',
        logs_desc: 'Canale Log & Trascrizioni'
    },
    buttons: {
        edit_naming: 'Denominazione',
        edit_limits: 'Modifica Limiti',
        blacklist: 'Blacklist',
        language: 'Lingua',
        edit_general: 'Modifica Info Generali',
        edit_welcome: 'Modifica Messaggio Benvenuto'
    },
    placeholders: {
        category: '📂 Categoria Ticket Predefinita',
        support_roles: '🛡️ Seleziona Ruoli Supporto',
        admin_roles: '👑 Seleziona Ruoli Admin',
        log_channel: '📜 Canale Log',
        send_panel: '📤 Invia Pannello al Canale...'
    },
    messages: {
        updated: '✅ Impostazioni {section} aggiornate!',
        error: '❌ Impossibile aggiornare la configurazione.',
        only_owner: 'Solo il proprietario del server può configurare il bot.',
        panel_sent: '✅ Pannello inviato a {channel}!',
        select_panel_channel: '❌ Seleziona prima un Canale Pannello!'
    },
    types: {
        panel_title: 'Titolo Pannello',
        panel_desc: 'Desc. Pannello',
        timestamp: 'Data e Ora',
        header_types: '[TIPI]',
        header_texts: '[TESTI]',
        unified_panel: '🌐 Pannello Principale Unificato (Tutti)',
        unified_desc: 'Invia il pannello integrato con menu di selezione',
        individual: '📨 Individuale: {type}',
        individual_desc: 'Invia un pannello a pulsante singolo per {type}'
    },
    security: {
        blacklist_count: 'Blacklist ({count})'
    },
    logs: {
        audit_enabled: 'Audit: ON',
        audit_disabled: 'Audit: OFF',
        format: 'Formato: {format}'
    },

    modals: {
        edit_type: 'Modifica Tipo: {type}',
        edit_limits: 'Modifica Limiti',
        edit_texts: 'Modifica Testi Globali',
        edit_panel: 'Modifica Pannello Unificato',
        edit_welcome_msg: 'Modifica Messaggio Benvenuto',
        add_type: 'Aggiungi Nuovo Tipo Ticket'
    },
    ticket: {
        config_error: 'Errore di configurazione.',
        invalid_type: 'Tipo ticket non valido.',
        open_title: 'Apri Ticket: {type}',
        default_desc: 'Descrivi il tuo problema',
        created: '✅ Ticket creato con successo: {channel}',
        create_failed: '❌ Creazione ticket fallita: {error}'
    }
};


