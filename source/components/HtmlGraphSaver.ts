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
    <style>
       body {
    display: flex;
    flex-direction: column;
    margin: 0;
    height: 100vh;
    background-color: #1e1e1e;
    font-family: Arial, sans-serif;
    color: #ffffff;
}

#title {
    text-align: center;
    font-size: 24px;
    font-weight: bold;
    color: #ffffff;
    height: 40px; /* Fixed height for the title */
    line-height: 40px; /* Vertically center the text */
    background-color: #1e1e1e;
}

#cy {
    flex: 1; /* The graph takes the remaining space */
    width: 100%;
    background-color: #000000;
    padding: 10px;
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
    'line-color': '#00ffff',
    'width': 2,
    'target-arrow-shape': 'triangle',
    'target-arrow-color': '#00ffff',
    'curve-style': 'taxi', // Correct taxi style
    'taxi-turn': 30, // Adjust turn distance for better visualization
    'taxi-direction': 'downward', // Controls edge direction
    'taxi-turn-min-distance': 20, // Ensures proper separation for multiple edges
    'label': 'data(label)', // Add labels properly
    'color': '#ffffff',
    'font-size': 12,
    'text-background-color': '#1e1e1e',
    'text-background-opacity': 0.7,
    'text-margin-y': -5,
},

},

    {
        selector: 'node',
        style: {
            'background-color': '#2b2b2b',
            'border-color': '#00ffff',
            'border-width': 1,
            'shape': 'round-rectangle',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': 14,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'label',
            'height': 'label',
            'padding': 30,
        },
    },
],
            layout: {
    name: 'dagre',
    rankDir: 'LR', // Left-to-Right layout
    nodeSep: 70, // Spacing between nodes
    edgeSep: 50, // Spacing between edges
    rankSep: 150, // Spacing between ranks (hierarchical levels)
    animate: true, // Animate the layout rendering
    fit: true, // Fit graph to the viewport
    padding: 20, // Padding around the graph
    directed: true, // Keep edges directed
    spacingFactor: 1.5, // Increase spacing between elements
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
