# csit314_softwaredev

Docker Compose setup.

## Prerequisites
- Docker Desktop installed and running
- Internet connection (first run downloads images/packages)

## macOS Setup
1. Install Docker Desktop:
   ```bash
   brew install --cask docker
   ```
2. Start Docker Desktop:
   ```bash
   open -a Docker
   ```
3. Restart your terminal, then verify:
   ```bash
   docker --version
   docker compose version
   ```

## Windows Setup
1. Install Docker Desktop from:
   `https://www.docker.com/products/docker-desktop/`
2. Open Docker Desktop and wait until it says Docker is running.
3. Open PowerShell (or Command Prompt) and verify:
   ```powershell
   docker --version
   docker compose version
   ```

## VS Code Setup (macOS and Windows)
1. Install Visual Studio Code:
   `https://code.visualstudio.com/`
2. Open VS Code.
3. Open the project folder:
   - `File` -> `Open Folder...` -> select `csit314_softwaredev`
4. Open the integrated terminal:
   - `Terminal` -> `New Terminal`
5. (Optional but recommended) Install the `Docker` extension in VS Code.
6. Run the project from the terminal:
   ```bash
   cd bingbongfundraisers
   docker compose up --build
   ```

## Run the Project
From the repository root:

```bash
cd bingbongfundraisers
docker compose up --build
```

Open:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5001/api/health`

## Stop the Project
In the same terminal:

```bash
Ctrl + C
```

Then remove containers:

```bash
docker compose down
```
