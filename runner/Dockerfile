FROM python:3.13-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY server.py test_runner.py test_sandbox.py ./
EXPOSE 8091
CMD ["python", "-u", "server.py"]
