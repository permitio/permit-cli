import i18next from 'i18next';

export const getNamespaceIl18n = (prefixKey: string) => {
    return (key: string, options: Object = {}) => {
        const [ns, ...prefix] = prefixKey.split('.')
        return i18next.t(`${prefix.length > 0 ? prefix.join('.').concat('.') : ''}${key}`, { ns, ...options })
    }
}