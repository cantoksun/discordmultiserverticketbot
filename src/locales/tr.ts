export default {
    system: {
        title: '⚙️ sunucu yapılandırması',
        enabled: 'sistem',
        dm_notifications: 'dm bildirimleri',
        naming: 'isimlendirme',
        auto_close: 'oto-kapatma',
        transcript: 'transkript',
        max_tickets: 'max bilet',
        cooldown: 'bekleme süresi',
        on: 'açık',
        off: 'kapalı',
        yes: 'evet',
        no: 'hayır',
        disabled: 'devre dışı',
        assigned: 'atandı',
        not_set: 'ayarlanmadı'
    },
    nav: {
        placeholder: '📂 kategori değiştir',
        system: 'sistem',
        system_desc: 'genel ayarlar & kanallar',
        types: 'bilet türleri',
        types_desc: 'türler & panel tasarımı',
        security: 'güvenlik',
        security_desc: 'roller, limitler & kara liste',
        logs: 'loglar',
        logs_desc: 'log kanalı & transkript ayarları'
    },
    buttons: {
        edit_naming: 'isimlendirme',
        edit_limits: 'limitleri düzenle',
        blacklist: 'kara liste',
        language: 'dil',
        edit_general: 'genel bilgileri düzenle',
        edit_welcome: 'karşılama mesajını düzenle'
    },
    placeholders: {
        category: '📂 varsayılan bilet kategorisi',
        support_roles: '🛡️ destek rollerini seç',
        admin_roles: '👑 yönetici rollerini seç',
        log_channel: '📜 log kanalı',
        send_panel: '📤 paneli kanala gönder...'
    },
    messages: {
        updated: '✅ {section} ayarları güncellendi!',
        error: '❌ ayarlar güncellenemedi.',
        only_owner: 'bu komutu sadece sunucu sahibi kullanabilir.',
        panel_sent: '✅ panel {channel} kanalına gönderildi!',
        select_panel_channel: '❌ lütfen önce bir panel kanalı seçin!'
    },
    types: {
        panel_title: 'panel başlığı',
        panel_desc: 'panel açıklaması',
        timestamp: 'zaman damgası',
        header_types: '[bilet türleri]',
        header_texts: '[metinler]',
        unified_panel: '🌐 birleşik ana panel (tüm türler)',
        unified_desc: 'seçim menülü entegre paneli gönderir',
        individual: '📨 bireysel: {type}',
        individual_desc: '{type} için tek butonlu panel gönderir'
    },
    security: {
        blacklist_count: 'kara liste ({count})'
    },
    logs: {
        audit_enabled: 'denetim: açık',
        audit_disabled: 'denetim: kapalı',
        format: 'format: {format}'
    },

    modals: {
        edit_type: 'tür düzenle: {type}',
        edit_limits: 'limitleri düzenle',
        edit_texts: 'global metinleri düzenle',
        edit_panel: 'birleşik paneli düzenle',
        edit_welcome_msg: 'karşılama mesajını düzenle',
        add_type: 'yeni bilet türü ekle'
    },
    ticket: {
        config_error: 'yapılandırma hatası.',
        invalid_type: 'geçersiz bilet türü.',
        open_title: 'bilet aç: {type}',
        default_desc: 'sorununuzu açıklayın',
        created: '✅ bilet başarıyla oluşturuldu: {channel}',
        create_failed: '❌ bilet oluşturulamadı: {error}'
    }
};


