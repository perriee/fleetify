package repository

import (
	"fleetify/internal/model"

	"gorm.io/gorm"
)

// USER REPOSITORY
type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindAll() ([]model.User, error) {
	var users []model.User
	err := r.db.Find(&users).Error
	return users, err
}

// VEHICLE REPOSITORY
type VehicleRepository struct{ db *gorm.DB }

func NewVehicleRepository(db *gorm.DB) *VehicleRepository {
	return &VehicleRepository{db: db}
}

func (r *VehicleRepository) FindAll() ([]model.Vehicle, error) {
	var vehicles []model.Vehicle
	err := r.db.Find(&vehicles).Error
	return vehicles, err
}

// MASTER ITEM REPOSITORY
type MasterItemRepository struct{ db *gorm.DB }

func NewMasterItemRepository(db *gorm.DB) *MasterItemRepository {
	return &MasterItemRepository{db: db}
}

func (r *MasterItemRepository) FindAll() ([]model.MasterItem, error) {
	var items []model.MasterItem
	err := r.db.Find(&items).Error
	return items, err
}

func (r *MasterItemRepository) FindByID(id uint) (*model.MasterItem, error) {
	var item model.MasterItem
	err := r.db.First(&item, id).Error
	return &item, err
}

// REPORT REPOSITORY
type ReportRepository struct{ db *gorm.DB }

func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) FindAll() ([]model.MaintenanceReport, error) {
	var reports []model.MaintenanceReport
	err := r.db.
		Preload("Vehicle").   
		Preload("Creator").   
		Preload("Items.Item"). 
		Order("created_at DESC").
		Find(&reports).Error
	return reports, err
}

func (r *ReportRepository) FindByID(id uint) (*model.MaintenanceReport, error) {
	var report model.MaintenanceReport
	err := r.db.
		Preload("Vehicle").
		Preload("Creator").
		Preload("Items.Item").
		First(&report, id).Error
	return &report, err
}

func (r *ReportRepository) CreateWithItems(report *model.MaintenanceReport, items []model.ReportItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(report).Error; err != nil {
			return err 
		}

		for i := range items {
			items[i].ReportID = report.ID
		}
		if err := tx.Create(&items).Error; err != nil {
			return err 
		}

		return nil 
	})
}

func (r *ReportRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.MaintenanceReport{}).
		Where("id = ?", id).
		Update("status", status).Error
}

func (r *ReportRepository) UpdateProofPhoto(id uint, proofPhoto string) error {
	return r.db.Model(&model.MaintenanceReport{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"proof_photo": proofPhoto,
			"status":      "COMPLETED",
		}).Error
}
