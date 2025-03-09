import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { execSync } from 'child_process';
import bodyParser from 'body-parser';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.text({ type: 'application/x-hcl' }));
app.use(cors());

app.post('/apply', (req, res) => {
	const tempDir = `temp-${Math.random().toString(36).substring(7)}`;
	const TF_FILE = path.join(__dirname, `${tempDir}/config.tf`);

	const generateTfFile = (data, apiKey) => {
		const tfContent = data.replace('{{API_KEY}}', `"` + apiKey + `"`);
		const dirPath = path.dirname(TF_FILE);
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		fs.writeFileSync(TF_FILE, tfContent, 'utf-8');
	};

	try {
		console.log('API CALL IS RECIVED');
		const apiKey = req.headers['authorization'];
		if (!apiKey) {
			return res.status(400).json({ error: 'API Key is required' });
		}
		generateTfFile(req.body, apiKey);
      const { stdout, stderr } = execSync(
        'terraform init && terraform apply -auto-approve',
        { cwd: `${__dirname}/${tempDir}` }
      );
      if (stderr) {
        res.status(500).json({ error: stderr });
      }
      res.json({ message: 'Terraform successful', output: stdout });
	} catch (error) {
		res.status(400).json({ error: error.message });
	} finally {
    // Remove the temp directory
    fs.rmSync(`${__dirname}/${tempDir}`, { recursive: true });
    console.log('APICALL COMPLETED'); 
  }
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
