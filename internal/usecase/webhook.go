package usecase

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type WebhookPayload struct {
	Event     string    `json:"event"`    
	ReportID  uint      `json:"report_id"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

func TriggerWebhook(reportID uint, status string) {
	webhookURL := os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		return 
	}

	go func() {
		payload := WebhookPayload{
			Event:     "REPORT_" + status,
			ReportID:  reportID,
			Status:    status,
			Timestamp: time.Now(),
		}

		body, err := json.Marshal(payload)
		if err != nil {
			log.Printf("Webhook marshal error: %v", err)
			return
		}

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Post(webhookURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			log.Printf("Webhook gagal dikirim ke %s: %v", webhookURL, err)
			return
		}
		defer resp.Body.Close()

		log.Printf("Webhook terkirim ke %s, status HTTP: %d", webhookURL, resp.StatusCode)
	}()
}
