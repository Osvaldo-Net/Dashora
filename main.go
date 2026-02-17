
package main

import (
        "database/sql"
        "encoding/json"
        "encoding/xml"
        "fmt"
        "io"
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
        ID    int    `json:"id"`
        Name  string `json:"name"`
        URL   string `json:"url"`
        Icon  string `json:"icon"`
        Group string `json:"group"`
        Order int    `json:"order"`
}

type RSSFeed struct {
        ID          int    `json:"id"`
        Title       string `json:"title"`
        URL         string `json:"url"`
        MaxEntries  int    `json:"max_entries"`
        LastFetchAt string `json:"last_fetch_at"`
        CachedItems string `json:"cached_items"`
}

// RSSItemJSON es lo que se guarda en caché y se envía al frontend
type RSSItemJSON struct {
        Title   string `json:"title"`
        Link    string `json:"link"`
        PubDate string `json:"pubDate"`
}

// Structs internos para parsear el XML del feed
type rssXMLItem struct {
        Title       string `xml:"title"`
        Link        string `xml:"link"`
        Description string `xml:"description"`
        PubDate     string `xml:"pubDate"`
        GUID        string `xml:"guid"`
}

type rssXMLChannel struct {
        Title string       `xml:"title"`
        Items []rssXMLItem `xml:"item"`
}

type rssXML struct {
        Channel rssXMLChannel `xml:"channel"`
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

        createSettings := `
        CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                background_image TEXT DEFAULT '',
                background_opacity INTEGER DEFAULT 50
        );`
        if _, err = db.Exec(createSettings); err != nil {
                log.Fatal(err)
        }
        _, err = db.Exec("INSERT OR IGNORE INTO settings (id, background_image, background_opacity) VALUES (1, '', 50)")
        if err != nil {
                log.Fatal(err)
        }

        createBookmarks := `
        CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                icon TEXT DEFAULT '',
                bookmark_group TEXT DEFAULT 'Sin Grupo',
                sort_order INTEGER DEFAULT 0
        );`
        if _, err = db.Exec(createBookmarks); err != nil {
                log.Fatal(err)
        }

        createRSSFeeds := `
        CREATE TABLE IF NOT EXISTS rss_feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                max_entries INTEGER DEFAULT 5,
                last_fetch_at TEXT DEFAULT '',
                cached_items TEXT DEFAULT '[]'
        );`
        if _, err = db.Exec(createRSSFeeds); err != nil {
                log.Fatal(err)
        }

        // Migraciones
        var count int
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('services') WHERE name='description'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE services ADD COLUMN description TEXT DEFAULT ''")
        }
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name='icon'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE bookmarks ADD COLUMN icon TEXT DEFAULT ''")
        }
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name='bookmark_group'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE bookmarks ADD COLUMN bookmark_group TEXT DEFAULT 'Sin Grupo'")
        }
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('bookmarks') WHERE name='sort_order'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE bookmarks ADD COLUMN sort_order INTEGER DEFAULT 0")
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
        rows, err := db.Query("SELECT id, name, url, COALESCE(icon,''), COALESCE(bookmark_group,'Sin Grupo'), sort_order FROM bookmarks ORDER BY bookmark_group ASC, sort_order ASC, id ASC")
        if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        defer rows.Close()
        bookmarks := make([]Bookmark, 0)
        for rows.Next() {
                var b Bookmark
                if err := rows.Scan(&b.ID, &b.Name, &b.URL, &b.Icon, &b.Group, &b.Order); err != nil {
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
                http.Error(w, "name and url required", http.StatusBadRequest)
                return
        }
        if b.Group == "" {
                b.Group = "Sin Grupo"
        }
        result, err := db.Exec("INSERT INTO bookmarks (name, url, icon, bookmark_group, sort_order) VALUES (?, ?, ?, ?, 0)",
                b.Name, b.URL, b.Icon, b.Group)
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
        if b.Group == "" {
                b.Group = "Sin Grupo"
        }
        if _, err := db.Exec("UPDATE bookmarks SET name=?, url=?, icon=?, bookmark_group=? WHERE id=?",
                b.Name, b.URL, b.Icon, b.Group, b.ID); err != nil {
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

// ─── RSS FEEDS ─────────────────────────────────────────────────────────────
func getRSSFeeds(w http.ResponseWriter, r *http.Request) {
        rows, err := db.Query("SELECT id, title, url, max_entries, COALESCE(last_fetch_at,''), COALESCE(cached_items,'[]') FROM rss_feeds ORDER BY id ASC")
        if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        defer rows.Close()
        feeds := make([]RSSFeed, 0)
        for rows.Next() {
                var f RSSFeed
                if err := rows.Scan(&f.ID, &f.Title, &f.URL, &f.MaxEntries, &f.LastFetchAt, &f.CachedItems); err != nil {
                        http.Error(w, err.Error(), http.StatusInternalServerError)
                        return
                }
                feeds = append(feeds, f)
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(feeds)
}

func addRSSFeed(w http.ResponseWriter, r *http.Request) {
        var f RSSFeed
        if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if f.Title == "" || f.URL == "" {
                http.Error(w, "title and url required", http.StatusBadRequest)
                return
        }
        if f.MaxEntries <= 0 {
                f.MaxEntries = 5
        }
        result, err := db.Exec("INSERT INTO rss_feeds (title, url, max_entries, last_fetch_at, cached_items) VALUES (?, ?, ?, '', '[]')",
                f.Title, f.URL, f.MaxEntries)
        if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        id, _ := result.LastInsertId()
        f.ID = int(id)
        f.LastFetchAt = ""
        f.CachedItems = "[]"
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(f)
}

func updateRSSFeed(w http.ResponseWriter, r *http.Request) {
        var f RSSFeed
        if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if _, err := db.Exec("UPDATE rss_feeds SET title=?, url=?, max_entries=? WHERE id=?",
                f.Title, f.URL, f.MaxEntries, f.ID); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(f)
}

func deleteRSSFeed(w http.ResponseWriter, r *http.Request) {
        var f RSSFeed
        if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if _, err := db.Exec("DELETE FROM rss_feeds WHERE id = ?", f.ID); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// parseRSSFeed intenta parsear un feed RSS con múltiples estrategias
// para manejar variaciones en el formato XML (link como texto, CDATA, etc.)
func parseRSSFeed(body []byte, maxEntries int) ([]RSSItemJSON, error) {
        // Estrategia 1: parseo estándar con xml:"link"
        var feed rssXML
        if err := xml.Unmarshal(body, &feed); err != nil {
                return nil, err
        }

        items := feed.Channel.Items
        if len(items) > maxEntries {
                items = items[:maxEntries]
        }

        result := make([]RSSItemJSON, 0, len(items))
        for _, item := range items {
                link := strings.TrimSpace(item.Link)

                // Si link está vacío, intentar usar GUID como fallback
                if link == "" {
                        link = strings.TrimSpace(item.GUID)
                }

                title := strings.TrimSpace(item.Title)
                if title == "" {
                        title = "Sin título"
                }

                result = append(result, RSSItemJSON{
                        Title:   title,
                        Link:    link,
                        PubDate: strings.TrimSpace(item.PubDate),
                })
        }
        return result, nil
}

func fetchRSSFeed(w http.ResponseWriter, r *http.Request) {
        var req struct {
                ID int `json:"id"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }

        var feedURL string
        var maxEntries int
        err := db.QueryRow("SELECT url, max_entries FROM rss_feeds WHERE id = ?", req.ID).Scan(&feedURL, &maxEntries)
        if err != nil {
                http.Error(w, "feed not found", http.StatusNotFound)
                return
        }

        client := &http.Client{Timeout: 15 * time.Second}
        resp, err := client.Get(feedURL)
        if err != nil {
                http.Error(w, "failed to fetch feed: "+err.Error(), http.StatusInternalServerError)
                return
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                http.Error(w, "failed to read feed", http.StatusInternalServerError)
                return
        }

        jsonItems, err := parseRSSFeed(body, maxEntries)
        if err != nil {
                http.Error(w, "failed to parse feed: "+err.Error(), http.StatusInternalServerError)
                return
        }

        cachedItemsJSON, _ := json.Marshal(jsonItems)
        now := time.Now().Format(time.RFC3339)
        _, err = db.Exec("UPDATE rss_feeds SET last_fetch_at=?, cached_items=? WHERE id=?", now, string(cachedItemsJSON), req.ID)
        if err != nil {
                http.Error(w, "failed to update cache", http.StatusInternalServerError)
                return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "items":      jsonItems,
                "last_fetch": now,
        })
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
                CPUPercent: cpuPct, RAMPercent: ramPct, RAMUsedGB: ramUsed, RAMTotalGB: ramTotal,
                DiskPercent: diskPct, DiskUsedGB: diskUsed, DiskTotalGB: diskTotal, Uptime: uptimeStr,
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(info)
}

// ─── CORS & MAIN ───────────────────────────────────────────────────────────
func cors(next http.HandlerFunc, methods string) http.HandlerFunc {
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

        http.HandleFunc("/api/services", cors(func(w http.ResponseWriter, r *http.Request) {
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

        http.HandleFunc("/api/bookmarks", cors(func(w http.ResponseWriter, r *http.Request) {
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

        http.HandleFunc("/api/rss", cors(func(w http.ResponseWriter, r *http.Request) {
                switch r.Method {
                case "GET":
                        getRSSFeeds(w, r)
                case "POST":
                        addRSSFeed(w, r)
                case "PUT":
                        updateRSSFeed(w, r)
                case "DELETE":
                        deleteRSSFeed(w, r)
                default:
                        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                }
        }, "GET, POST, PUT, DELETE, OPTIONS"))

        http.HandleFunc("/api/rss/fetch", cors(fetchRSSFeed, "POST, OPTIONS"))

        http.HandleFunc("/api/settings", cors(func(w http.ResponseWriter, r *http.Request) {
                switch r.Method {
                case "GET":
                        getSettings(w, r)
                case "PUT":
                        updateSettings(w, r)
                default:
                        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                }
        }, "GET, PUT, OPTIONS"))

        http.HandleFunc("/api/sysinfo", func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Access-Control-Allow-Origin", "*")
                getSysInfo(w, r)
        })

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
