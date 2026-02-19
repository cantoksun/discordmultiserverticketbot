import en from '../../locales/en';
import tr from '../../locales/tr';
import es from '../../locales/es';
import fr from '../../locales/fr';
import de from '../../locales/de';
import it from '../../locales/it';
import ru from '../../locales/ru';
import zh from '../../locales/zh';

const locales: Record<string, any> = { en, tr, es, fr, de, it, ru, zh };


export function t(lang: string, key: string, args?: Record<string, string>): string {
    const keys = key.split('.');
    let value = locales[lang] || locales['en'];

    for (const k of keys) {
        if (value) value = value[k];
        else break;
    }

    if (!value || typeof value !== 'string') {
        // Fallback to English
        value = locales['en'];
        for (const k of keys) {
            if (value) value = value[k];
            else break;
        }
    }

    if (!value || typeof value !== 'string') return key;

    if (args) {
        for (const [k, v] of Object.entries(args)) {
            value = value.replace(`{${k}}`, v);
        }
    }

    return value;
}
