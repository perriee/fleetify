package handler

import (
	"fmt"
	"strconv"
	"strings"

	"fleetify/internal/middleware"
	"fleetify/internal/model"
	"fleetify/internal/repository"

	"github.com/gofiber/fiber/v2"
)

// REQUEST/RESPONSE STRUCTS
type CreateReportRequest struct {
	VehicleID    uint                `json:"vehicle_id"`
	Odometer     int                 `json:"odometer"`
	Complaint    string              `json:"complaint"`
	InitialPhoto string              `json:"initial_photo"`
	Items        []ReportItemRequest `json:"items"`
}

type ReportItemRequest struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

type CompleteReportRequest struct {
	ProofPhoto string `json:"proof_photo"` 
}

// HANDLER STRUCT 
type Handler struct {
	userRepo    *repository.UserRepository
	vehicleRepo *repository.VehicleRepository
	itemRepo    *repository.MasterItemRepository
	reportRepo  *repository.ReportRepository
}

func NewHandler(
	userRepo *repository.UserRepository,
	vehicleRepo *repository.VehicleRepository,
	itemRepo *repository.MasterItemRepository,
	reportRepo *repository.ReportRepository,
) *Handler {
	return &Handler{userRepo, vehicleRepo, itemRepo, reportRepo}
}

// MASTER DATA HANDLERS
// GetUsers - GET /api/users
func (h *Handler) GetUsers(c *fiber.Ctx) error {
	users, err := h.userRepo.FindAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(users)
}

// GetVehicles - GET /api/vehicles
func (h *Handler) GetVehicles(c *fiber.Ctx) error {
	vehicles, err := h.vehicleRepo.FindAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(vehicles)
}

// GetMasterItems - GET /api/master-items
func (h *Handler) GetMasterItems(c *fiber.Ctx) error {
	items, err := h.itemRepo.FindAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(items)
}

// REPORT HANDLERS
// GetReports - GET /api/reports (F-04: Riwayat Laporan)
func (h *Handler) GetReports(c *fiber.Ctx) error {
	reports, err := h.reportRepo.FindAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(reports)
}

// GetReportByID - GET /api/reports/:id
func (h *Handler) GetReportByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	report, err := h.reportRepo.FindByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Laporan tidak ditemukan"})
	}
	return c.JSON(report)
}

// CreateReport - POST /api/reports (F-01, Role: SA)
func (h *Handler) CreateReport(c *fiber.Ctx) error {
	currentUser := middleware.GetCurrentUser(c)

	var req CreateReportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Request body tidak valid"})
	}

	if req.VehicleID == 0 || req.Odometer == 0 || req.Complaint == "" {
		return c.Status(400).JSON(fiber.Map{"error": "vehicle_id, odometer, dan complaint wajib diisi"})
	}
	if len(req.Items) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Minimal satu item harus ditambahkan"})
	}

	report := model.MaintenanceReport{
		VehicleID:    req.VehicleID,
		CreatedBy:    currentUser.ID,
		Odometer:     req.Odometer,
		Complaint:    req.Complaint,
		Status:       "PENDING_APPROVAL", 
		InitialPhoto: req.InitialPhoto,
	}

	var reportItems []model.ReportItem
	for _, reqItem := range req.Items {
		masterItem, err := h.itemRepo.FindByID(reqItem.ItemID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": fmt.Sprintf("Item ID %d tidak ditemukan", reqItem.ItemID),
			})
		}

		qty := reqItem.Quantity
		if qty <= 0 {
			qty = 1
		}

		reportItems = append(reportItems, model.ReportItem{
			ItemID:        masterItem.ID,
			Quantity:      qty,
			PriceSnapshot: masterItem.Price, 
		})
	}

	if err := h.reportRepo.CreateWithItems(&report, reportItems); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan laporan: " + err.Error()})
	}

	fullReport, _ := h.reportRepo.FindByID(report.ID)
	return c.Status(201).JSON(fullReport)
}

// ApproveReport - PATCH /api/reports/:id/approve (F-02, Role: APPROVAL)
func (h *Handler) ApproveReport(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	report, err := h.reportRepo.FindByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Laporan tidak ditemukan"})
	}

	if report.Status != "PENDING_APPROVAL" {
		return c.Status(400).JSON(fiber.Map{"error": "Hanya laporan berstatus PENDING_APPROVAL yang bisa disetujui"})
	}

	if err := h.reportRepo.UpdateStatus(uint(id), "APPROVED"); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}


	return c.JSON(fiber.Map{"message": "Laporan berhasil disetujui", "report_id": id})
}

// CompleteReport - PATCH /api/reports/:id/complete (F-03, Role: SA)
func (h *Handler) CompleteReport(c *fiber.Ctx) error {
	currentUser := middleware.GetCurrentUser(c)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID tidak valid"})
	}

	report, err := h.reportRepo.FindByID(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Laporan tidak ditemukan"})
	}

	if report.CreatedBy != currentUser.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Hanya SA pembuat laporan yang bisa menyelesaikan laporan ini",
		})
	}

	if report.Status != "APPROVED" {
		return c.Status(400).JSON(fiber.Map{"error": "Hanya laporan berstatus APPROVED yang bisa diselesaikan"})
	}

	var req CompleteReportRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.ProofPhoto) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "proof_photo wajib diisi"})
	}

	if err := h.reportRepo.UpdateProofPhoto(uint(id), req.ProofPhoto); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Laporan berhasil diselesaikan", "report_id": id})
}
