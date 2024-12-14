import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
	en: {
		translation: {
			keyAccountDescription:
				'A string (e.g. the Permit Environment or Project key) to act as the account this would be saved under in the machine secure key-chain',
			useApiKeyDescription: 'Use API key instead of user authentication',
			useWorkspaceDescription: 'Use predefined workspace to Login',
			loggedInMessage:
				'Logged in to {{organization}} with selected environment as {{environment}}',
		},
	},
};


i18next.use(initReactI18next).init({
	resources,
	lng: 'en',
	fallbackLng: 'en', 
	interpolation: {
		escapeValue: false,
	},
});

export default i18next;
