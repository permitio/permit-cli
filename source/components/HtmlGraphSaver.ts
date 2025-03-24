import { readFileSync ,writeFileSync } from 'fs';
import { resolve } from 'path';
import open from 'open';

// Define the data structure for a graph node's data
interface GraphNodeData {
	id: string;
	label: string;
}

// Define a graph node; `classes` is optional
interface GraphNode {
	data: GraphNodeData;
	classes?: string;
}

// Define the data structure for a graph edge's data
interface GraphEdgeData {
	source: string;
	target: string;
	label: string;
}

// Define a graph edge; here `classes` is required
interface GraphEdge {
	data: GraphEdgeData;
	classes: string;
}

// Define the overall GraphData structure
interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export const saveHTMLGraph = (graphData: GraphData) => {
	const templatePath = resolve(process.cwd(), 'source', 'components', 'graph-template', 'graph-template.html');

	let htmlTemplate = readFileSync(templatePath, 'utf8');

	htmlTemplate = htmlTemplate.replace('<!-- GRAPH_DATA_PLACEHOLDER -->', JSON.stringify(graphData, null, 2));

	const outputHTMLPath = resolve(process.cwd(), 'permit-graph.html');

	writeFileSync(outputHTMLPath, htmlTemplate, 'utf8');
	console.log(`Graph saved as: ${outputHTMLPath}`);
	open(outputHTMLPath);
};
