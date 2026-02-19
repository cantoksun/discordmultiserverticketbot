export default {
    system: {
        title: '⚙️ Configuración del Servidor',
        enabled: 'Sistema',
        dm_notifications: 'Notificaciones DM',
        naming: 'Esquema de Nombres',
        auto_close: 'Cierre Automático',
        transcript: 'Transcripción',
        max_tickets: 'Tickets Máx',
        cooldown: 'Enfriamiento',
        on: 'ENCENDIDO',
        off: 'APAGADO',
        yes: 'SÍ',
        no: 'NO',
        disabled: 'DESACTIVADO',
        assigned: 'Asignado',
        not_set: 'NO ESTABLECIDO'
    },
    nav: {
        placeholder: '📂 Cambiar Categoría',
        system: 'Sistema',
        system_desc: 'Configuración General y Canales',
        types: 'Tipos de Ticket',
        types_desc: 'Tipos y Diseño del Panel',
        security: 'Seguridad',
        security_desc: 'Roles, Límites y Lista Negra',
        logs: 'Registros',
        logs_desc: 'Canal de Registros y Transcripciones'
    },
    buttons: {
        edit_naming: 'Nombrado',
        edit_limits: 'Editar Límites',
        blacklist: 'Lista Negra',
        language: 'Idioma',
        edit_general: 'Editar Info General',
        edit_welcome: 'Editar Mensaje Bienvenida'
    },
    placeholders: {
        category: '📂 Categoría de Ticket Predeterminada',
        support_roles: '🛡️ Seleccionar Roles de Soporte',
        admin_roles: '👑 Seleccionar Roles de Administrador',
        log_channel: '📜 Canal de Registros',
        send_panel: '📤 Enviar Panel al Canal...'
    },
    messages: {
        updated: '✅ ¡Configuración de {section} actualizada!',
        error: '❌ Error al actualizar la configuración.',
        only_owner: 'Solo el propietario del servidor puede configurar el bot.',
        panel_sent: '✅ ¡Panel enviado a {channel}!',
        select_panel_channel: '❌ ¡Por favor, selecciona un Canal de Panel primero!'
    },
    types: {
        panel_title: 'Título del Panel',
        panel_desc: 'Desc. del Panel',
        timestamp: 'Marca de tiempo',
        header_types: '[TIPOS]',
        header_texts: '[TEXTOS]',
        unified_panel: '🌐 Panel Principal Unificado (Todos)',
        unified_desc: 'Envía el panel integrado con menú de selección',
        individual: '📨 Individual: {type}',
        individual_desc: 'Envía un panel de un solo botón para {type}'
    },
    security: {
        blacklist_count: 'Lista Negra ({count})'
    },
    logs: {
        audit_enabled: 'Auditoría: ON',
        audit_disabled: 'Auditoría: OFF',
        format: 'Formato: {format}'
    },

    modals: {
        edit_type: 'Editar Tipo: {type}',
        edit_limits: 'Editar Límites',
        edit_texts: 'Editar Textos Globales',
        edit_panel: 'Editar Panel Unificado',
        edit_welcome_msg: 'Editar Mensaje Bienvenida',
        add_type: 'Añadir Nuevo Tipo de Ticket'
    },
    ticket: {
        config_error: 'Error de configuración.',
        invalid_type: 'Tipo de ticket inválido.',
        open_title: 'Abrir Ticket: {type}',
        default_desc: 'Describe tu problema',
        created: '✅ Ticket creado exitosamente: {channel}',
        create_failed: '❌ Error al crear ticket: {error}'
    }
};


