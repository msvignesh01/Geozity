FROM node:24.17.0-bookworm-slim AS frontend-build
WORKDIR /build/frontend
RUN npm install --global pnpm@12.5.1
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm test && pnpm build

FROM python:3.11-slim-bookworm AS backend-build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"
RUN python -m venv /opt/venv
WORKDIR /build
COPY backend/requirements.lock.txt backend/requirements.render.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.render.txt
COPY backend/ ./backend/
RUN python -m pytest backend -q && pip check

FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"
RUN useradd --uid 10001 --create-home geozity
WORKDIR /app/backend
COPY --from=backend-build /opt/venv /opt/venv
COPY --from=backend-build /build/backend/app.py /build/backend/gunicorn.conf.py ./
COPY --from=backend-build /build/backend/services ./services/
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist/
USER geozity
EXPOSE 10000
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
