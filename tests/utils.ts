export const getMockFetchResponse = () => {
	return {
		ok: true,
		status: 200,
		statusText: "OK",
		headers: new Headers({ "Content-Type": "application/json" }),
		json: async () => ({  }),
		text: async () => JSON.stringify({ }),
	}
}
