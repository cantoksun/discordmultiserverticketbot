export default {
    system: {
        title: '⚙️ Server-Konfiguration',
        enabled: 'System',
        dm_notifications: 'DM-Benachrichtigungen',
        naming: 'Benennungsschema',
        auto_close: 'Auto-Schließen',
        transcript: 'Transkript',
        max_tickets: 'Max Tickets',
        cooldown: 'Abklingzeit',
        on: 'AN',
        off: 'AUS',
        yes: 'JA',
        no: 'NEIN',
        disabled: 'DEAKTIVIERT',
        assigned: 'Zugeordnet',
        not_set: 'NICHT GESETZT'
    },
    nav: {
        placeholder: '📂 Kategorie wechseln',
        system: 'System',
        system_desc: 'Allgemeine Einstellungen & Kanäle',
        types: 'Ticket-Typen',
        types_desc: 'Typen & Panel-Design',
        security: 'Sicherheit',
        security_desc: 'Rollen, Limits & Blacklist',
        logs: 'Protokolle',
        logs_desc: 'Protokoll-Kanal & Transkripte'
    },
    buttons: {
        edit_naming: 'Benennung',
        edit_limits: 'Limits bearbeiten',
        blacklist: 'Blacklist',
        language: 'Sprache / Language'
    },
    placeholders: {
        category: '📂 Standard-Ticket-Kategorie',
        support_roles: '🛡️ Support-Rollen auswählen',
        admin_roles: '👑 Admin-Rollen auswählen',
        log_channel: '📜 Protokoll-Kanal',
        send_panel: '📤 Panel an Kanal senden...'
    },
    messages: {
        updated: '✅ {section} Einstellungen aktualisiert!',
        error: '❌ Konfiguration konnte nicht aktualisiert werden.',
        only_owner: 'Nur der Serverbesitzer kann den Bot konfigurieren.',
        panel_sent: '✅ Panel an {channel} gesendet!',
        select_panel_channel: '❌ Bitte wählen Sie zuerst einen Panel-Kanal aus!'
    },
    types: {
        panel_title: 'Panel-Titel',
        panel_desc: 'Panel-Beschr.',
        timestamp: 'Zeitstempel',
        header_types: '[TYPEN]',
        header_texts: '[TEXTE]',
        unified_panel: '🌐 Einheitliches Hauptpanel (Alle)',
        unified_desc: 'Sendet das integrierte Auswahlmenü-Panel',
        individual: '📨 Individuell: {type}',
        individual_desc: 'Sendet ein Ein-Button-Panel für {type}'
    },
    security: {
        blacklist_count: 'Blacklist ({count})'
    },
    logs: {
        audit_enabled: 'Audit: AN',
        audit_disabled: 'Audit: AUS',
        format: 'Format: {format}'
    },

    modals: {
        edit_type: 'Typ bearbeiten: {type}',
        edit_limits: 'Limits bearbeiten',
        edit_texts: 'Globale Texte bearbeiten',
        edit_panel: 'Einheitliches Panel bearbeiten',
        edit_welcome_msg: 'Willkommensnachricht bearbeiten',
        add_type: 'Neuen Ticket-Typ hinzufügen'
    },
    ticket: {
        config_error: 'Konfigurationsfehler.',
        invalid_type: 'Ungültiger Ticket-Typ.',
        open_title: 'Ticket öffnen: {type}',
        default_desc: 'Beschreiben Sie Ihr Problem',
        created: '✅ Ticket erfolgreich erstellt: {channel}',
        create_failed: '❌ Ticket konnte nicht erstellt werden: {error}'
    }
};


