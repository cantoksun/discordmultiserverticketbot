export default {
    system: {
        title: '⚙️ Configuration du Serveur',
        enabled: 'Système',
        dm_notifications: 'Notifications DM',
        naming: 'Schéma de Nommage',
        auto_close: 'Fermeture Auto',
        transcript: 'Transcription',
        max_tickets: 'Tickets Max',
        cooldown: 'Refroidissement',
        on: 'MARCHE',
        off: 'ARRÊT',
        yes: 'OUI',
        no: 'NON',
        disabled: 'DÉSACTIVÉ',
        assigned: 'Assigné',
        not_set: 'NON DÉFINI'
    },
    nav: {
        placeholder: '📂 Changer de Catégorie',
        system: 'Système',
        system_desc: 'Paramètres Généraux et Canaux',
        types: 'Types de Ticket',
        types_desc: 'Types et Design du Panneau',
        security: 'Sécurité',
        security_desc: 'Rôles, Limites et Liste Noire',
        logs: 'Journaux',
        logs_desc: 'Canal de Journaux et Transcriptions'
    },
    buttons: {
        edit_naming: 'Nommage',
        edit_limits: 'Modifier Limites',
        blacklist: 'Liste Noire',
        language: 'Langue',
        edit_general: 'Modifier Infos Générales',
        edit_welcome: 'Modifier Message Bienvenue'
    },
    placeholders: {
        category: '📂 Catégorie de Ticket Par Défaut',
        support_roles: '🛡️ Sélectionner Rôles Support',
        admin_roles: '👑 Sélectionner Rôles Admin',
        log_channel: '📜 Canal de Journaux',
        send_panel: '📤 Envoyer le Panneau au Canal...'
    },
    messages: {
        updated: '✅ Paramètres de {section} mis à jour !',
        error: '❌ Échec de la mise à jour de la configuration.',
        only_owner: 'Seul le propriétaire du serveur peut configurer le bot.',
        panel_sent: '✅ Panneau envoyé à {channel} !',
        select_panel_channel: '❌ Veuillez d\'abord sélectionner un Canal de Panneau !'
    },
    types: {
        panel_title: 'Titre du Panneau',
        panel_desc: 'Desc. du Panneau',
        timestamp: 'Horodatage',
        header_types: '[TYPES]',
        header_texts: '[TEXTES]',
        unified_panel: '🌐 Panneau Principal Unifié (Tous)',
        unified_desc: 'Envoie le panneau intégré avec menu de sélection',
        individual: '📨 Individuel : {type}',
        individual_desc: 'Envoie un panneau à bouton unique pour {type}'
    },
    security: {
        blacklist_count: 'Liste Noire ({count})'
    },
    logs: {
        audit_enabled: 'Audit : MARCHE',
        audit_disabled: 'Audit : ARRÊT',
        format: 'Format : {format}'
    },

    modals: {
        edit_type: 'Modifier Type : {type}',
        edit_limits: 'Modifier Limites',
        edit_texts: 'Modifier Textos Globaux',
        edit_panel: 'Modifier Panneau Unifié',
        edit_welcome_msg: 'Modifier Message Bienvenue',
        add_type: 'Ajouter Nouveau Type de Ticket'
    },
    ticket: {
        config_error: 'Erreur de configuration.',
        invalid_type: 'Type de ticket invalide.',
        open_title: 'Ouvrir Ticket : {type}',
        default_desc: 'Décrivez votre problème',
        created: '✅ Ticket créé avec succès : {channel}',
        create_failed: '❌ Échec de la création du ticket : {error}'
    }
};


