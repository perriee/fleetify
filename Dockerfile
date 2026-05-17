# STAGE 1: Builder
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o fleetify ./cmd/main.go

# STAGE 2: Runner
FROM alpine:3.18

WORKDIR /app

RUN apk add --no-cache tzdata

COPY --from=builder /app/fleetify .

COPY --from=builder /app/frontend ./frontend

EXPOSE 8080

CMD ["./fleetify"]
