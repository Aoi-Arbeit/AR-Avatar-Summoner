from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import characters, agent

app = FastAPI(title="AR Avatar Summoner API", version="2.0.0")

# CORS設定（開発用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(characters.router)
app.include_router(agent.router)


@app.get("/")
def root():
    return {"message": "AR Avatar Summoner API v2.0.0 (AI Agent拡張版) - 稼働中"}
