import i18next, { i18n } from 'i18next'; 
import locales from '../locales/index.js';
const { en } = locales;

i18next.init(   
	{
		fallbackLng: 'en',
		lng: 'en',
		resources: {
			en,
		},
	},
	err => {
		if (err) return console.error(err);
	},
);

export default i18next as i18n;
