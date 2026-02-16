# ALUPLA basic frontend (TypeScript)

Minimal React + Vite frontend to test the backend you built.

## Run

1) Keep backend running:
- http://localhost:4000/health should return {ok:true}

2) In a new terminal:
```bat
cd C:\Users\mac\Desktop\alupla\code\frontend
npm install
npm run dev
```

Open:
- http://localhost:5173

## Notes
- There is a demo login (localStorage) until we add real auth endpoints.
- API calls go to /api/* and are proxied to http://localhost:4000
