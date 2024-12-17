import i18next from 'i18next';
import en from './locales/en.json'; // Import the translations JSON file
const resources = {
	translation: en,
};

i18next.init({
	resources,
	lng: 'en',
	fallbackLng: 'en',
	interpolation: {
		escapeValue: false,
	},
});

export default i18next;
