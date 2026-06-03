package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// client holds the rate limiter and the last active time for an IP
type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	clients = make(map[string]*client)
	mu      sync.Mutex
)

// Clean up old clients every 10 minutes to prevent memory leaks
func init() {
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			mu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > 15*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// getVisitor retrieves or creates a rate limiter for a client IP
func getVisitor(ip string, r rate.Limit, b int) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	v, exists := clients[ip]
	if !exists {
		// rate.Limit(r) requests per second, burst size of b
		limiter := rate.NewLimiter(r, b)
		clients[ip] = &client{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// getClientIP extracts the real client IP, respecting proxy headers
func getClientIP(r *http.Request) string {
	// Respect standard reverse proxy headers first (Render, Cloudflare, etc.)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}
	return r.RemoteAddr
}

// RateLimitMiddleware enforces a global rate limit of 60 requests per minute per IP
func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		// 60 requests per minute = 1 request per second, with a burst buffer of 30 requests
		limiter := getVisitor(ip, 1, 30)

		if !limiter.Allow() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":"Too many requests. Please slow down."}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}
