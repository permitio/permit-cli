const { Permit } = require('permitio');

const express = require('express');
const app = express();
const port = 4000;

const permit = new Permit({
	pdp: 'http://localhost:7766',
	token: '{{API_KEY}}',
});

app.get('/', async (req, res) => {
	const user = {
		id: '{{USER_ID}}',
		firstName: '{{FIRST_NAME}}',
		lastName: '{{LAST_NAME}}',
		email: '{{EMAIL}}',
	};
	const permitted = await permit.check(
		'{{USER_ID}}',
		'{{ACTIONS}}',
		'{{RESOURCES}}',
	);
	if (permitted) {
		res
			.status(200)
			.send(
				`${user.firstName} ${user.lastName} is PERMITTED to '{{ACTIONS}}' '{{RESOURCES}}' !`,
			);
	} else {
		res
			.status(403)
			.send(
				`${user.firstName} ${user.lastName} is NOT PERMITTED to '{{ACTIONS}}' '{{RESOURCES}}' !`,
			);
	}
});

app.listen(port, () => {
	console.log('Example app listening at http://localhost:' + port);
});
