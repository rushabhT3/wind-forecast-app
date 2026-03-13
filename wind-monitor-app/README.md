# UK Wind Forecast Monitor

A full-stack application to monitor and analyse UK national wind power generation vs. BMRS Elexon forecasts (January 2024).

> **AI Disclosure:** This project was built with AI assistance (Claude by Anthropic) for code generation, scaffolding, and documentation.

---

## Project Structure

```
wind-monitor-app/
├── backend/            FastAPI 0.135.1 (Python 3.12)
│   ├── main.py         API server – fetches & processes BMRS data
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/           Next.js 16 + Tailwind CSS + Recharts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx    Dashboard UI
│   │   └── globals.css
│   ├── components/
│   │   ├── DatePicker.tsx
│   │   ├── HorizonSlider.tsx
│   │   ├── WindChart.tsx
│   │   └── StatsBar.tsx
│   ├── lib/api.ts
│   └── .env.local
├── analysis/
│   ├── notebook1_forecast_error.ipynb   Error analysis (MAE/P99/horizon)
│   ├── notebook2_reliability.ipynb      Reliability recommendation
│   └── requirements.txt
├── run.sh              Starts both servers concurrently
└── README.md
```

---

## Tech Stack

| Layer      | Technology                    | Version   |
|------------|-------------------------------|-----------|
| Backend    | FastAPI + uvicorn             | 0.135.1   |
| HTTP client| httpx (async)                 | 0.28.1    |
| Validation | Pydantic v2                   | 2.11.2    |
| Frontend   | Next.js (App Router)          | 16.x      |
| Styling    | Tailwind CSS                  | 3.x       |
| Charts     | Recharts                      | latest    |
| Analysis   | Jupyter + pandas + matplotlib | latest    |
| Data source| BMRS Elexon API               | public    |

---

## How to Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- npm 10+

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

### 3. Both at once

```bash
./run.sh
```

### 4. Analysis Notebooks

```bash
cd analysis
pip install -r requirements.txt
jupyter notebook
```

Open `notebook1_forecast_error.ipynb` or `notebook2_reliability.ipynb`.

---

## API Reference

### `GET /api/chart`

| Parameter      | Type    | Description                          |
|----------------|---------|--------------------------------------|
| `start_time`   | string  | ISO-8601 UTC (e.g. `2024-01-10T08:00:00Z`) |
| `end_time`     | string  | ISO-8601 UTC                         |
| `horizon_hours`| int     | Forecast horizon 0–48 (default: 4)   |

**Note:** Data is clamped to January 2024.

---

## Deployment

- **Backend:** Deploy the `backend/` folder to Heroku, Railway, or any platform supporting Python/Docker. Set the `PORT` environment variable.
- **Frontend:** Deploy the `frontend/` folder to Vercel. Set `NEXT_PUBLIC_API_URL` to your backend URL.

---

## Key Design Decisions

1. **Forecast selection logic:** For each target time T and horizon H, the backend selects the single most-recently published forecast whose `publishTime ≤ T − H hours`. Missing points are omitted, not interpolated.
2. **January 2024 only:** All data is clamped server-side; the UI prevents selecting out-of-range dates.
3. **Async throughout:** Both BMRS API calls (`actuals` + `forecasts`) are made concurrently via `asyncio.gather`.
4. **No caching layer:** Responses are fetched live from BMRS on each request. A Redis cache can be added for production.
