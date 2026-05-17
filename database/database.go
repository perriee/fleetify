package database

import (
	"fmt"
	"log"
	"os"

	"fleetify/internal/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect() *gorm.DB {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Gagal koneksi ke database: %v", err)
	}

	err = db.AutoMigrate(
		&model.User{},
		&model.Vehicle{},
		&model.MasterItem{},
		&model.MaintenanceReport{},
		&model.ReportItem{},
	)
	if err != nil {
		log.Fatalf("Gagal migrasi tabel: %v", err)
	}

	log.Println("Database terhubung & tabel siap")
	return db
}

func Seed(db *gorm.DB) {
	seedUsers(db)
	seedVehicles(db)
	seedMasterItems(db)
	log.Println("Seeder selesai")
}

func seedUsers(db *gorm.DB) {
	users := []model.User{
		{Username: "budi_sa", Role: "SA"},
		{Username: "sari_sa", Role: "SA"},
		{Username: "manager_approval", Role: "APPROVAL"},
	}

	for _, u := range users {
		db.Where(model.User{Username: u.Username}).FirstOrCreate(&u)
	}
}

func seedVehicles(db *gorm.DB) {
	vehicles := []model.Vehicle{
		{LicensePlate: "B 1234 ABC", Model: "Toyota Avanza 2022"},
		{LicensePlate: "B 5678 DEF", Model: "Honda CR-V 2021"},
		{LicensePlate: "D 9012 GHI", Model: "Mitsubishi Pajero 2023"},
	}

	for _, v := range vehicles {
		db.Where(model.Vehicle{LicensePlate: v.LicensePlate}).FirstOrCreate(&v)
	}
}

func seedMasterItems(db *gorm.DB) {
	items := []model.MasterItem{
		{ItemName: "Oli Mesin 5W-30", Type: "PART", Price: 85000},
		{ItemName: "Filter Oli", Type: "PART", Price: 45000},
		{ItemName: "Ban Radial 195/65 R15", Type: "PART", Price: 750000},
		{ItemName: "Jasa Ganti Oli", Type: "SERVICE", Price: 50000},
		{ItemName: "Jasa Tune Up", Type: "SERVICE", Price: 200000},
		{ItemName: "Kampas Rem Depan", Type: "PART", Price: 180000},
		{ItemName: "Jasa Balancing & Spooring", Type: "SERVICE", Price: 150000},
	}

	for _, item := range items {
		db.Where(model.MasterItem{ItemName: item.ItemName}).FirstOrCreate(&item)
	}
}
