import { writeFileSync } from 'fs';
import { resolve } from 'path';
import open from 'open';

export const saveHTMLGraph = (graphData: { nodes: any[]; edges: any[] }) => {
	const outputHTMLPath = resolve(process.cwd(), 'permit-graph.html');
	const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReBAC Graph</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.23.0/cytoscape.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js"></script>
    <script src="https://unpkg.com/cytoscape-dagre/cytoscape-dagre.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap" rel="stylesheet">

    <style>
        body {
            display: flex;
            flex-direction: column;
            margin: 0;
            height: 100vh;
            background-color: rgb(43, 20, 0);
            font-family: 'Manrope', Arial, sans-serif;
            color: #ffffff;
        }

        #title {
        text-align: center;
        font-size: 30px;
        font-weight: 600;
        height: 50px;
        line-height: 50px;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent; /* Makes the text color transparent to apply gradient */
        background-image: linear-gradient(to right, #ffba81, #bb84ff); /* Gradient color */
        background-color: rgb(43, 20, 0); /* Same background color as bg-[#2B1400] */
        }

        #cy {
        flex: 1;
        width: 100%;
        background-color: #FFF1E7; /* Base background color */
        padding: 10px;
        background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAj0lEQVR4Ae3YMQoEIRBE0Ro1NhHvfz8xMhXc3RnYGyjFwH8n6E931NfnRy8W9HIEuBHgRoAbAW4EuBHgRoAbAW4EuBHglrTZGEOtNcUYVUpRzlknbd9A711rLc05n5DTtgfcw//dWzhte0CtVSklhRCeEzrt4jNnRoAbAW4EuBHgRoAbAW4EuBHgRoAbAW5fFH4dU6tFNJ4AAAAASUVORK5CYII=");
        background-size: 30px 35px; /* Matches the original image dimensions */
        background-repeat: repeat; /* Ensures the pattern repeats */
        }
    </style>
</head>
<body>
    <div id="title">Permit ReBAC Graph</div>
    <div id="cy"></div>
    <script>
        const graphData = ${JSON.stringify(graphData, null, 2)};
        cytoscape.use(cytoscapeDagre);

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: [...graphData.nodes, ...graphData.edges],
            style: [
                {
                    selector: 'edge',
                    style: {
                        'line-color': 'rgb(18, 165, 148)',
                        'width': 5,
                        'shape': 'round-rectangle',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': 'rgb(18, 165, 148)',
                        'curve-style': 'taxi',
                        'taxi-turn': '45%',
                        'taxi-direction': 'vertical',
                        'taxi-turn-min-distance': 5,
                        'label': 'data(label)',
                        'color': '#ffffff',
                        'font-size': 25,
                        'font-family': 'Manrope, Arial, sans-serif',
                        'font-weight': 500, /* Adjusted for edge labels */
                        'text-background-color': 'rgb(18, 165, 148)',
                        'text-background-opacity': 0.8,
                        'text-background-padding': 8,
                        'text-margin-y': 0,
                    },
                },{
                    selector: 'edge.relationship-connection',
                    style: {
                        'line-color': '#F76808',
                        'target-arrow-color': '#F76808', 
                        'text-background-color': '#F76808',
                        }
                },
                {
                    selector: 'node',
                    style: {
                        'background-color': 'rgb(255, 255, 255)',
                        'border-color': 'rgb(211, 179, 250)',
                        'border-width': 8,
                        'shape': 'round-rectangle',
                        'label': 'data(label)',
                        'color': 'rgb(151, 78, 242)',
                        'font-size': 30,
                        'font-family': 'Manrope, Arial, sans-serif',
                        'font-weight': 700, /* Adjusted for node labels */
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 'label',
                        'height': 'label',
                        'padding': 45,
                    },
                },{
	             selector: 'node.user-node',
	             style: {
		                'border-color': '#FFB381', /*light Orange border */
		                'color': '#F76808', /* Orange text */
	 
                     },             
                },
                        {
	             selector: 'node.resource-instance-node',
	             style: {
		             'border-color': '#D3B3FA', /* light Purple border */
		             'color': '#974EF2', /* Purple text */
	
                     },
                },
            ],
            layout: {
                name: 'dagre',
                rankDir: 'LR',
                nodeSep: 250,
                edgeSep: 300,
                rankSep: 350,
                animate: true,
                fit: true,
                padding: 20,
                directed: true,
                spacingFactor: 1.5,
            },
        });
    </script>
</body>
</html>
`;

	writeFileSync(outputHTMLPath, htmlTemplate, 'utf8');
	console.log(`Graph saved as: ${outputHTMLPath}`);
	open(outputHTMLPath);
};
