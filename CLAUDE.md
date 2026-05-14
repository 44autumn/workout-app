# 筋トレ管理アプリ

モバイルファーストの筋トレ記録Webアプリ。

## 技術スタック

- **Backend**: FastAPI + SQLAlchemy (async) + asyncpg + Neon PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS
- **デプロイ**: フロントエンド → Vercel、バックエンド → Render

## ディレクトリ構成

```
backend/          FastAPI アプリ
frontend/         React + Vite アプリ
render.yaml       Render デプロイ設定
vercel.json       Vercel SPA ルーティング設定
```

## ローカル開発

### 環境変数

**バックエンド** (`backend/.env`):
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CORS_ORIGINS=http://localhost:5173
```

**フロントエンド** (`frontend/.env.local`):
```
VITE_API_URL=http://localhost:8000
```

### バックエンド起動

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

起動時に自動でテーブル作成 + プリセットデータ挿入が行われます。
API ドキュメントは http://localhost:8000/docs で確認できます。

### フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 でアクセスできます。
`/api/*` への リクエストは自動的に `localhost:8000` にプロキシされます。

## デプロイ

### Render (バックエンド)

1. GitHub にプッシュ
2. Render ダッシュボードで "New Web Service" → リポジトリ選択
3. `render.yaml` が自動検出される
4. 環境変数を手動設定:
   - `DATABASE_URL`: Neon の接続文字列 (`postgresql://...?sslmode=require`)
   - `CORS_ORIGINS`: Vercel の URL (`https://your-app.vercel.app`)

### Vercel (フロントエンド)

1. Vercel ダッシュボードで "New Project" → リポジトリ選択
2. フレームワーク: Vite
3. ルートディレクトリ: `frontend`
4. 環境変数を設定:
   - `VITE_API_URL`: Render の URL (`https://workout-backend.onrender.com`)

## API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | /muscle-groups | 全部位一覧（種目含む） |
| GET | /workouts/calendar?year=&month= | カレンダー用データ |
| GET | /workouts/history | 直近10セッション |
| GET | /workouts/{date} | 特定日のセッション詳細 |
| POST | /workouts | セッション作成 |
| POST | /workouts/{session_id}/sets | セット追加 |
| PUT | /workouts/sets/{set_id} | セット更新 |
| DELETE | /workouts/sets/{set_id} | セット削除 |
| DELETE | /workouts/{session_id} | セッション削除 |
