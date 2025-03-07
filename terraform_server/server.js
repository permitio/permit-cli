const express = require("express");
const fs = require("fs");
const path = require("path");
const cors= require("cors");
const { exec } = require("child_process");
const bodyParser = require("body-parser");


const app = express();
app.use(bodyParser.text({ type: "application/x-hcl" }));
app.use(cors())
const TF_FILE = path.join(__dirname, "temp/config.tf");

const generateTfFile = (data, apiKey) => {
  const tfContent = data.replace("{{API_KEY}}", `"` + apiKey + `"`);
  const dirPath = path.dirname(TF_FILE);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(TF_FILE, tfContent,"utf-8");
};

app.post("/apply", (req, res) => {
  try {
    console.log("API CALL IS RECIVED")
    const apiKey = req.headers["authorization"];
    if (!apiKey) {
      return res.status(400).json({ error: "API Key is required" });
    }
    generateTfFile(req.body, apiKey);
    exec(
      "terraform init && terraform apply -auto-approve",
      { cwd: __dirname + "/temp" },
      (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: stderr || error.message });
        }
        res.json({ message: "Terraform successful", output: stdout });
      },
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
  console.log("APICALL COMPLETED")
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
