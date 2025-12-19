import asyncio
import hashlib
import json
import os
import re
from dataclasses import dataclass
from typing import Literal

from fastapi import FastAPI
from redis.asyncio import Redis

from app.models import ParseRequest, ParseResponse
from app.utils.executor import run_in_thread
from app.parsers.yandex import YandexMapsParser
from app.parsers.gis import GisParser
from app.parsers.google import GoogleParser


conut_days = 3
ParserKind = Literal["yandex", "2gis", "google"]

PARSER_WORKERS = int(os.getenv("PARSER_WORKERS", "5"))
PARSER_QUEUE_MAX = int(os.getenv("PARSER_QUEUE_MAX", "200"))
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", str(conut_days * 24 * 3600)))

app = FastAPI(title="Company Parser API", version="2.0.0")

redis: Redis | None = None
queue: asyncio.Queue["Job"] = asyncio.Queue(maxsize=PARSER_QUEUE_MAX)
worker_tasks: list[asyncio.Task] = []


@dataclass
class Job:
    kind: ParserKind
    url: str
    future: asyncio.Future


def _extract_id(kind: ParserKind, url: str) -> str | None:
    if kind == "2gis":
        m = re.search(r"/firm/(\d+)", url)
        return m.group(1) if m else None
    if kind == "yandex":
        m = re.search(r"/org/[^/]+/(\d+)", url)
        if m:
            return m.group(1)
        m = re.search(r"oid=(\d+)", url)
        return m.group(1) if m else None
    return None


def _cache_key(kind: ParserKind, url: str) -> str:
    org_id = _extract_id(kind, url)
    if org_id:
        return f"cache:{kind}:org:{org_id}"
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()
    return f"cache:{kind}:url:{h}"


def _parse_blocking(worker_id: int, kind: ParserKind, url: str) -> dict:
    profile_id = f"profile-{worker_id}"

    if kind == "yandex":
        parser = YandexMapsParser(profile_id=profile_id)
        return parser.parse(url)

    if kind == "2gis":
        parser = GisParser(profile_id=profile_id)
        return parser.parse(url)

    if kind == "google":
        parser = GoogleParser()
        return parser.parse(url)


async def _worker_loop(worker_id: int):
    while True:
        job = await queue.get()
        try:
            data = await run_in_thread(_parse_blocking, worker_id, job.kind, job.url)
            if not job.future.cancelled():
                job.future.set_result(data)
        except Exception as e:
            if not job.future.cancelled():
                job.future.set_exception(e)
        finally:
            queue.task_done()


@app.on_event("startup")
async def startup():
    global redis, worker_tasks
    redis = Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        password=os.getenv("REDIS_PASSWORD"),
        decode_responses=True,
    )
    worker_tasks = [asyncio.create_task(_worker_loop(i)) for i in range(PARSER_WORKERS)]


@app.on_event("shutdown")
async def shutdown():
    for t in worker_tasks:
        t.cancel()
    if redis:
        await redis.aclose()


in_flight: dict[str, asyncio.Future] = {}
in_flight_lock = asyncio.Lock()


async def _finalize_in_flight(key: str, fut: asyncio.Future):
    try:
        data = fut.result()
    except Exception:
        data = None

    if data is not None and redis:
        await redis.set(key, json.dumps(data, ensure_ascii=False), ex=CACHE_TTL_SECONDS)

    async with in_flight_lock:
        if in_flight.get(key) is fut:
            del in_flight[key]


async def _enqueue_and_wait(kind: ParserKind, url: str) -> dict:
    key = _cache_key(kind, url)

    if redis:
        cached = await redis.get(key)
        if cached:
            return json.loads(cached)

    loop = asyncio.get_running_loop()

    async with in_flight_lock:
        fut = in_flight.get(key)
        if fut is None:
            if queue.full():
                raise RuntimeError("queue_full")

            fut = loop.create_future()
            in_flight[key] = fut
            fut.add_done_callback(lambda f, k=key: asyncio.create_task(_finalize_in_flight(k, f)))

            creator = True
        else:
            creator = False

    if creator:
        try:
            queue.put_nowait(Job(kind=kind, url=url, future=fut))
        except asyncio.QueueFull:
            fut.set_exception(RuntimeError("queue_full"))
            raise RuntimeError("queue_full")

    return await asyncio.shield(fut)



@app.get("/")
async def root():
    return {"message": "Parser API running!"}


@app.get("/health")
async def health():
    return {"status": "ok", "queue": queue.qsize(), "workers": PARSER_WORKERS}


@app.post("/parse/yandex", response_model=ParseResponse)
async def parse_yandex(req: ParseRequest):
    try:
        data = await _enqueue_and_wait("yandex", req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))
    

@app.post("/parse/2gis", response_model=ParseResponse)
async def parse_gis(req: ParseRequest):
    try:
        data = await _enqueue_and_wait("2gis", req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))


@app.post("/parse/google", response_model=ParseResponse)
async def parse_google(req: ParseRequest):
    try:
        data = await _enqueue_and_wait("google", req.url)
        return ParseResponse(success=True, data=data)
    except Exception as e:
        return ParseResponse(success=False, error=str(e))
