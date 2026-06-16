# Deploying Hired v2 on Render

This guide outlines the steps to deploy the Hired v2 platform (Express backend + Vite React frontend + Python AI agent) on Render.

---

## Prerequisites

Before deploying, ensure you have:
1. A **Render** account (https://render.com).
2. A **MongoDB Atlas** database connection URI (https://www.mongodb.com/cloud/atlas).
3. A **Groq** API key (https://console.groq.com) for running the resume tailoring LLM.
4. (Optional) A **SerpAPI** key if you want live google search integration.

---

## Option 1: Blueprint Deployment (Recommended)

Render Blueprints allow you to deploy the entire stack automatically using the [render.yaml](file:///Users/atharvakalekar/Desktop/Hired%20v2%20copy/render.yaml) configuration file.

1. Commit and push your codebase to a repository on GitHub or GitLab.
2. Go to the **Render Dashboard**.
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub/GitLab repository.
5. Render will automatically parse the `render.yaml` file and create two services:
   - **`hired-backend`** (Web Service)
   - **`hired-frontend`** (Static Site)
6. During the initial setup, you will be prompted to enter the values for the following environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `SERPAPI_KEY`
7. Click **Apply** to start the deployment.

---

## Option 2: Manual Dashboard Deployment

If you prefer deploying the services manually via the Render UI dashboard, follow these steps:

### 1. Deploy the Backend Web Service

1. On Render Dashboard, click **New +** and select **Web Service**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `hired-backend`
   - **Environment**: `Node`
   - **Root Directory**: `Backend`
   - **Build Command**: `npm install && npm run build` (This installs Node modules and builds the Python `venv` + pip requirements)
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5001`
   - `MONGODB_URI`: *[Your MongoDB connection string]*
   - `JWT_SECRET`: *[Your JWT signing secret]*
   - `GROQ_API_KEY`: *[Your Groq API key]*
   - `SERPAPI_KEY`: *[Your SerpAPI key]*
5. Click **Deploy Web Service**.

### 2. Deploy the Frontend Static Site

1. Click **New +** and select **Static Site**.
2. Connect your Git repository.
3. Configure the following fields:
   - **Name**: `hired-frontend`
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add the following **Environment Variables**:
   - `VITE_API_URL`: *[URL of your deployed backend service, e.g., `https://hired-backend.onrender.com`]*
5. Click **Deploy Static Site**.

---

## Behind the Scenes (How it Works)

- **Python Virtualenv**: The Node.js Web Service build process triggers `python3 -m venv ai_agent/venv` and installs all CrewAI/litellm dependencies in a virtual environment. The backend automatically detects and targets this virtual env to invoke the resume tailoring scripts in production.
- **Tectonic/PDF Fallback**: If local Tectonic LaTeX compiling is missing in the production environment, the backend automatically engages a cloud-based LaTeX compiler fallback to compile resumes into downloadable PDFs without breaking.