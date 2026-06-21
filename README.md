# River Rat Rounders

This repo now includes both:

- a Vite frontend in the project root
- a local Python backend in [`backend/`](./backend)

## Frontend

```bash
npm install
npm run dev
```

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Local integration

The frontend defaults to the local API adapter:

```bash
VITE_USE_LOCAL_API=true
VITE_API_BASE_URL=/api
```

Vite proxies `/api` and `/uploads` to `http://localhost:8000`.

If you want to switch back to Base44 later, set:

```bash
VITE_USE_LOCAL_API=false
```
