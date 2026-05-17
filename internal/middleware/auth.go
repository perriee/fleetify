package middleware

import (
	"fleetify/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func AuthMiddleware(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userIDStr := c.Get("X-User-ID")
		if userIDStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Header X-User-ID wajib disertakan",
			})
		}

		var user model.User
		if err := db.First(&user, userIDStr).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User tidak ditemukan",
			})
		}

		c.Locals("currentUser", user)
		return c.Next()
	}
}

func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("currentUser").(model.User)
		if user.Role != role {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Akses ditolak. Role yang dibutuhkan: " + role,
			})
		}
		return c.Next()
	}
}

func GetCurrentUser(c *fiber.Ctx) model.User {
	return c.Locals("currentUser").(model.User)
}
