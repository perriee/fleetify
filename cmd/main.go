package main

import (
	"log"
	"os"

	"fleetify/database"
	"fleetify/internal/handler"
	"fleetify/internal/middleware"
	"fleetify/internal/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	db := database.Connect()

	database.Seed(db)

	// Inisialisasi semua repository (Repository Pattern)
	userRepo := repository.NewUserRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	itemRepo := repository.NewMasterItemRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// Inisialisasi handler dengan dependency injection
	h := handler.NewHandler(userRepo, vehicleRepo, itemRepo, reportRepo)

	app := fiber.New(fiber.Config{
		AppName: "Fleetify Fleet Maintenance",
	})

	// Global middleware
	app.Use(logger.New()) 
	app.Use(cors.New())   

	app.Static("/", "./frontend")

	// ==========================================================================
	// API ROUTES
	// ==========================================================================
	api := app.Group("/api")

	api.Get("/users", h.GetUsers)

	protected := api.Group("", middleware.AuthMiddleware(db))

	// Master data
	protected.Get("/vehicles", h.GetVehicles)
	protected.Get("/master-items", h.GetMasterItems)

	// Laporan - semua role bisa lihat riwayat (F-04)
	protected.Get("/reports", h.GetReports)
	protected.Get("/reports/:id", h.GetReportByID)

	// F-01: Buat laporan - hanya SA
	protected.Post("/reports",
		middleware.RequireRole("SA"),
		h.CreateReport,
	)

	// F-02: Setujui laporan - hanya APPROVAL
	protected.Patch("/reports/:id/approve",
		middleware.RequireRole("APPROVAL"),
		h.ApproveReport,
	)

	// F-03: Selesaikan laporan - hanya SA
	protected.Patch("/reports/:id/complete",
		middleware.RequireRole("SA"),
		h.CompleteReport,
	)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Fleetify berjalan di port %s", port)
	log.Fatal(app.Listen(":" + port))
}
