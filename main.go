package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"syscall"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Service struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Icon        string `json:"icon"`
	URL         string `json:"url"`
	Description string `json:"description"`
	Group       string `json:"group"`
	Order       int    `json:"order"`
}

type Bookmark struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	URL  string `json:"url"`
}

type SysInfo struct {
	CPUPercent  float64 `json:"cpu_percent"`
	RAMPercent  float64 `json:"ram_percent"`
	RAMUsedGB   string  `json:"ram_used_gb"`
	RAMTotalGB  string  `json:"ram_total_gb"`
	DiskPercent float64 `json:"disk_percent"`
	DiskUsedGB  string  `json:"disk_used_gb"`
	DiskTotalGB string  `json:"disk_total_gb"`
	Uptime      string  `json:"uptime"`
}

type Settings struct {
	BackgroundImage   string `json:"background_image"`
	BackgroundOpacity int    `json:"background_opacity"`
}

var db *sql.DB

func initDB() {
	var err error
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./dashboard.db"
	}
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal(err)
	}

	// Tabla services
	createTable := `
	CREATE TABLE IF NOT EXISTS services (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		icon TEXT NOT NULL,
		url TEXT NOT NULL,
		description TEXT DEFAULT '',
		service_group TEXT DEFAULT 'Sin Grupo',
		sort_order INTEGER DEFAULT 0
	);`
	if _, err = db.Exec(createTable); err != nil {
		log.Fatal(err)
	}

	// Tabla settings
	createSettings := `
	CREATE TABLE IF NOT EXISTS settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		background_image TEXT DEFAULT '',
		background_opacity INTEGER DEFAULT 50
	);`
	if _, err = db.Exec(createSettings); err != nil {
		log.Fatal(err)
	}

	// Settings por defecto
	_, err = db.Exec("INSERT OR IGNORE INTO settings (id, background_image, background_opacity) VALUES (1, '', 50)")
	if err != nil {
		log.Fatal(err)
	}

	// Tabla bookmarks
	createBookmarks := `
	CREATE TABLE IF NOT EXISTS bookmarks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		url TEXT NOT NULL,
		sort_order INTEGER DEFAULT 0
	);`
	if _, err = db.Exec(createBookmarks); err != nil {
		log.Fatal(err)
	}

	// Migración: columna description en services
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('services') WHERE name='description'").Scan(&count)
	if err == nil && count == 0 {
		log.Println("Migrando base de datos: agregando columna 'description'...")
		_, err = db.Exec("ALTER TABLE services ADD COLUMN description TEXT DEFAULT ''")
		if err != nil {
			log.Printf("Advertencia: no se pudo agregar columna description: %v", err)
		}
	}
}

// ─── SERVICES ──────────────────────────────────────────────────────────────

func getServices(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, title, icon, url, COALESCE(description, ''), service_group, sort_order FROM services ORDER BY service_group ASC, sort_order ASC, id ASC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	services := make([]Service, 0)
	for rows.Next() {
		var s Service
		if err := rows.Scan(&s.ID, &s.Title, &s.Icon, &s.URL, &s.Description, &s.Group, &s.Order); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		services = append(services, s)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(services)
}

func addService(w http.ResponseWriter, r *http.Request) {
	var s Service
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if s.Group == "" {
		s.Group = "Sin Grupo"
	}
	if len(s.Description) > 23 {
		s.Description = s.Description[:23]
	}
	result, err := db.Exec("INSERT INTO services (title, icon, url, description, service_group, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
		s.Title, s.Icon, s.URL, s.Description, s.Group, s.Order)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := result.LastInsertId()
	s.ID = int(id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func deleteService(w http.ResponseWriter, r *http.Request) {
	var s Service
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, err := db.Exec("DELETE FROM services WHERE id = ?", s.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func updateService(w http.ResponseWriter, r *http.Request) {
	var s Service
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if s.Group == "" {
		s.Group = "Sin Grupo"
	}
	if len(s.Description) > 23 {
		s.Description = s.Description[:23]
	}
	if _, err := db.Exec("UPDATE services SET title=?, icon=?, url=?, description=?, service_group=?, sort_order=? WHERE id=?",
		s.Title, s.Icon, s.URL, s.Description, s.Group, s.Order, s.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

// ─── BOOKMARKS ─────────────────────────────────────────────────────────────

func getBookmarks(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, url FROM bookmarks ORDER BY sort_order ASC, id ASC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	bookmarks := make([]Bookmark, 0)
	for rows.Next() {
		var b Bookmark
		if err := rows.Scan(&b.ID, &b.Name, &b.URL); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		bookmarks = append(bookmarks, b)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookmarks)
}

func addBookmark(w http.ResponseWriter, r *http.Request) {
	var b Bookmark
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if b.Name == "" || b.URL == "" {
		http.Error(w, "name and url are required", http.StatusBadRequest)
		return
	}
	result, err := db.Exec("INSERT INTO bookmarks (name, url, sort_order) VALUES (?, ?, 0)", b.Name, b.URL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := result.LastInsertId()
	b.ID = int(id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func updateBookmark(w http.ResponseWriter, r *http.Request) {
	var b Bookmark
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, err := db.Exec("UPDATE bookmarks SET name=?, url=? WHERE id=?", b.Name, b.URL, b.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func deleteBookmark(w http.ResponseWriter, r *http.Request) {
	var b Bookmark
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, err := db.Exec("DELETE FROM bookmarks WHERE id = ?", b.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// ─── SETTINGS ──────────────────────────────────────────────────────────────

func getSettings(w http.ResponseWriter, r *http.Request) {
	var settings Settings
	err := db.QueryRow("SELECT background_image, background_opacity FROM settings WHERE id = 1").Scan(&settings.BackgroundImage, &settings.BackgroundOpacity)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func updateSettings(w http.ResponseWriter, r *http.Request) {
	var settings Settings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := db.Exec("UPDATE settings SET background_image = ?, background_opacity = ? WHERE id = 1",
		settings.BackgroundImage, settings.BackgroundOpacity)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// ─── SYSINFO ───────────────────────────────────────────────────────────────

func readCPUStat() (total, idle uint64) {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0, 0
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "cpu ") {
			fields := strings.Fields(line)
			var vals [10]uint64
			for i := 1; i < len(fields) && i <= 10; i++ {
				fmt.Sscanf(fields[i], "%d", &vals[i-1])
				total += vals[i-1]
			}
			idle = vals[3]
			break
		}
	}
	return
}

func getCPUPercent() float64 {
	t1, i1 := readCPUStat()
	time.Sleep(200 * time.Millisecond)
	t2, i2 := readCPUStat()
	if t2 == t1 {
		return 0
	}
	cpu := (1.0 - float64(i2-i1)/float64(t2-t1)) * 100.0
	if cpu < 0 {
		cpu = 0
	}
	if cpu > 100 {
		cpu = 100
	}
	return math.Round(cpu*10) / 10
}

func getRAM() (usedGB, totalGB string, percent float64) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return "?", "?", 0
	}
	var memTotal, memAvail uint64
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		switch fields[0] {
		case "MemTotal:":
			fmt.Sscanf(fields[1], "%d", &memTotal)
		case "MemAvailable:":
			fmt.Sscanf(fields[1], "%d", &memAvail)
		}
	}
	if memTotal == 0 {
		return "?", "?", 0
	}
	used := memTotal - memAvail
	pct := math.Round(float64(used)/float64(memTotal)*1000) / 10
	return fmt.Sprintf("%.1f", float64(used)/1024/1024),
		fmt.Sprintf("%.1f", float64(memTotal)/1024/1024),
		pct
}

func getDisk() (usedGB, totalGB string, percent float64) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		return "?", "?", 0
	}
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used := total - free
	pct := math.Round(float64(used)/float64(total)*1000) / 10
	return fmt.Sprintf("%.0f", float64(used)/1024/1024/1024),
		fmt.Sprintf("%.0f", float64(total)/1024/1024/1024),
		pct
}

func formatUptime(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	mins := int(d.Minutes()) % 60
	if days > 0 {
		return fmt.Sprintf("%dd %dh", days, hours)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, mins)
	}
	return fmt.Sprintf("%dm", mins)
}

func getSysInfo(w http.ResponseWriter, r *http.Request) {
	cpuPct := getCPUPercent()
	ramUsed, ramTotal, ramPct := getRAM()
	diskUsed, diskTotal, diskPct := getDisk()

	uptimeStr := "?"
	data, err := os.ReadFile("/proc/uptime")
	if err == nil {
		var secs float64
		fmt.Sscanf(strings.TrimSpace(string(data)), "%f", &secs)
		uptimeStr = formatUptime(time.Duration(secs) * time.Second)
	}

	info := SysInfo{
		CPUPercent:  cpuPct,
		RAMPercent:  ramPct,
		RAMUsedGB:   ramUsed,
		RAMTotalGB:  ramTotal,
		DiskPercent: diskPct,
		DiskUsedGB:  diskUsed,
		DiskTotalGB: diskTotal,
		Uptime:      uptimeStr,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

func corsMiddleware(next http.HandlerFunc, methods string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", methods)
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func main() {
	initDB()
	defer db.Close()

	// Services
	http.HandleFunc("/api/services", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			getServices(w, r)
		case "POST":
			addService(w, r)
		case "DELETE":
			deleteService(w, r)
		case "PUT":
			updateService(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}, "GET, POST, PUT, DELETE, OPTIONS"))

	// Bookmarks
	http.HandleFunc("/api/bookmarks", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			getBookmarks(w, r)
		case "POST":
			addBookmark(w, r)
		case "PUT":
			updateBookmark(w, r)
		case "DELETE":
			deleteBookmark(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}, "GET, POST, PUT, DELETE, OPTIONS"))

	// Settings
	http.HandleFunc("/api/settings", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			getSettings(w, r)
		case "PUT":
			updateSettings(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}, "GET, PUT, OPTIONS"))

	// SysInfo
	http.HandleFunc("/api/sysinfo", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		getSysInfo(w, r)
	})

	// Static files
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".js") {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		} else if strings.HasSuffix(r.URL.Path, ".css") {
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		}
		fs.ServeHTTP(w, r)
	})))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeFile(w, r, "index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Dashboard corriendo en http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
