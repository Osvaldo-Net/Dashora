FROM golang:1.21-bullseye AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY go.mod go.sum* ./
RUN go mod download

# Copiar código fuente
COPY . .

# Compilar la aplicación
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o dashboard .

# Imagen final ligera
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar binario compilado
COPY --from=builder /app/dashboard .
COPY --from=builder /app/index.html .

# Crear volumen para la base de datos
VOLUME ["/app/data"]

# Exponer puerto
EXPOSE 8080

# Variable de entorno para la base de datos
ENV DB_PATH=/app/data/dashboard.db

CMD ["./dashboard"]
