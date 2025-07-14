# LMS App Template
This template configures a Learning Management System (LMS) with resources (`course`, `enrollment`, `assignment`), roles (`student`, `teacher`, `teaching_assistant`, `admin`), and fine-grained policies (e.g., students read enrolled courses).

## Usage
1. Install the Permit CLI: `npm install -g @permitio/cli`
2. Apply the template: `permit env template apply lms-app`
3. Replace `{{API_KEY}}` in `main.tf` with your Permit API key.