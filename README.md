# Eventora

Event booking platform — React client + Express/MongoDB server.

## Structure

- `client/` — React (Vite) frontend
- `server/` — Express + MongoDB backend

## Setup

```bash
npm install --prefix client
npm install --prefix server
npm install
```

Add a `.env` file in `server/` with `MONGODB_URI` and other required secrets.

## Run

```bash
npm run dev
```

Runs client (Vite) and server (nodemon) together.
