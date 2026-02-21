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
        "sort"
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

type RSSItemJSON struct {
        Title   string `json:"title"`
        Link    string `json:"link"`
        PubDate string `json:"pubDate"`
}

// ─── RSS (formato estándar) ─────────────────────────────────────────────────

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

// ─── Atom feed ─────────────────────────────────────────────────────────────

type atomLink struct {
        Href string `xml:"href,attr"`
        Rel  string `xml:"rel,attr"`
}

type atomEntry struct {
        Title   string     `xml:"title"`
        Links   []atomLink `xml:"link"`
        Updated string     `xml:"updated"`
        ID      string     `xml:"id"`
}

type atomFeed struct {
        Entries []atomEntry `xml:"entry"`
}

// ─── Resto de tipos ────────────────────────────────────────────────────────

type Integration struct {
        ID         int    `json:"id"`
        Name       string `json:"name"`
        IType      string `json:"itype"`
        URL        string `json:"url"`
        LastSync   string `json:"last_sync"`
        CachedData string `json:"cached_data"`
}

// ─── DISK INFO ─────────────────────────────────────────────────────────────

type DiskInfo struct {
        Name    string  `json:"name"`
        Path    string  `json:"path"`
        UsedGB  string  `json:"used_gb"`
        TotalGB string  `json:"total_gb"`
        Percent float64 `json:"percent"`
}

type SysInfo struct {
        CPUPercent  float64    `json:"cpu_percent"`
        RAMPercent  float64    `json:"ram_percent"`
        RAMUsedGB   string     `json:"ram_used_gb"`
        RAMTotalGB  string     `json:"ram_total_gb"`
        Disks       []DiskInfo `json:"disks"`
        // Campos legacy mantenidos para compatibilidad con frontend antiguo
        DiskPercent float64 `json:"disk_percent"`
        DiskUsedGB  string  `json:"disk_used_gb"`
        DiskTotalGB string  `json:"disk_total_gb"`
        Uptime      string  `json:"uptime"`
}

type Settings struct {
        BackgroundImage   string `json:"background_image"`
        BackgroundOpacity int    `json:"background_opacity"`
}

// ─── ADGUARD TYPES ─────────────────────────────────────────────────────────

type AdguardStatsResponse struct {
        TotalQueries      int              `json:"num_dns_queries"`
        QueriesSeries     []int            `json:"dns_queries"`
        BlockedQueries    int              `json:"num_blocked_filtering"`
        BlockedSeries     []int            `json:"blocked_filtering"`
        ResponseTime      float64          `json:"avg_processing_time"`
        TopBlockedDomains []map[string]int `json:"top_blocked_domains"`
}

type AdguardTopDomain struct {
        Domain  string `json:"domain"`
        Count   int    `json:"count"`
        Percent int    `json:"percent"`
}

type AdguardSeriesBar struct {
        Queries        int `json:"queries"`
        Blocked        int `json:"blocked"`
        PercentTotal   int `json:"percent_total"`
        PercentBlocked int `json:"percent_blocked"`
}

type AdguardStats struct {
        TotalQueries   int                `json:"total_queries"`
        BlockedQueries int                `json:"blocked_queries"`
        BlockedPercent int                `json:"blocked_percent"`
        ResponseTimeMs int                `json:"response_time_ms"`
        TopDomains     []AdguardTopDomain `json:"top_domains"`
        Series         []AdguardSeriesBar `json:"series"`
        TimeLabels     []string           `json:"time_labels"`
}

// ─── SYNCTHING TYPES ───────────────────────────────────────────────────────

type SyncthingFolder struct {
        ID    string `json:"id"`
        Label string `json:"label"`
        Path  string `json:"path"`
}

type SyncthingDevice struct {
        DeviceID string `json:"deviceID"`
        Name     string `json:"name"`
}

type SyncthingConfig struct {
        Folders []SyncthingFolder `json:"folders"`
        Devices []SyncthingDevice `json:"devices"`
}

type SyncthingCompletion struct {
        Completion  float64 `json:"completion"`
        GlobalBytes int64   `json:"globalBytes"`
        LocalBytes  int64   `json:"localBytes"`
        NeedBytes   int64   `json:"needBytes"`
        NeedDeletes int     `json:"needDeletes"`
        NeedFiles   int     `json:"needFiles"`
}

type SyncthingFolderStatus struct {
        FolderID   string              `json:"folder_id"`
        Label      string              `json:"label"`
        Completion SyncthingCompletion `json:"completion"`
        Reachable  bool                `json:"reachable"`
}

type SyncthingStats struct {
        Version string                  `json:"version"`
        Folders []SyncthingFolderStatus `json:"folders"`
        MyID    string                  `json:"my_id"`
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

        createIntegrations := `
        CREATE TABLE IF NOT EXISTS integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                itype TEXT NOT NULL DEFAULT 'uptime_kuma',
                url TEXT NOT NULL,
                last_sync TEXT DEFAULT '',
                cached_data TEXT DEFAULT '{}'
        );`
        if _, err = db.Exec(createIntegrations); err != nil {
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
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('integrations') WHERE name='username'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE integrations ADD COLUMN username TEXT DEFAULT ''")
        }
        err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('integrations') WHERE name='password'").Scan(&count)
        if err == nil && count == 0 {
                db.Exec("ALTER TABLE integrations ADD COLUMN password TEXT DEFAULT ''")
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

func parseRSSFeed(body []byte, maxEntries int) ([]RSSItemJSON, error) {
        var feed rssXML
        if err := xml.Unmarshal(body, &feed); err == nil && len(feed.Channel.Items) > 0 {
                items := feed.Channel.Items
                if len(items) > maxEntries {
                        items = items[:maxEntries]
                }
                result := make([]RSSItemJSON, 0, len(items))
                for _, item := range items {
                        link := strings.TrimSpace(item.Link)
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

        var atom atomFeed
        if err := xml.Unmarshal(body, &atom); err != nil {
                return nil, fmt.Errorf("no se pudo parsear como RSS ni como Atom: %w", err)
        }
        if len(atom.Entries) == 0 {
                return nil, fmt.Errorf("el feed no contiene ítems RSS ni entradas Atom")
        }

        entries := atom.Entries
        if len(entries) > maxEntries {
                entries = entries[:maxEntries]
        }
        result := make([]RSSItemJSON, 0, len(entries))
        for _, e := range entries {
                link := ""
                for _, l := range e.Links {
                        if l.Rel == "alternate" || l.Rel == "" {
                                link = strings.TrimSpace(l.Href)
                                break
                        }
                }
                if link == "" && len(e.Links) > 0 {
                        link = strings.TrimSpace(e.Links[0].Href)
                }
                if link == "" {
                        link = strings.TrimSpace(e.ID)
                }
                title := strings.TrimSpace(e.Title)
                if title == "" {
                        title = "Sin título"
                }
                result = append(result, RSSItemJSON{
                        Title:   title,
                        Link:    link,
                        PubDate: strings.TrimSpace(e.Updated),
                })
        }
        return result, nil
}

func newRSSRequest(feedURL string) (*http.Request, error) {
        req, err := http.NewRequest("GET", feedURL, nil)
        if err != nil {
                return nil, err
        }
        req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Dashboard-RSS/1.0)")
        req.Header.Set("Accept", "application/rss+xml, application/atom+xml, application/xml, text/xml, */*")
        return req, nil
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
        httpReq, err := newRSSRequest(feedURL)
        if err != nil {
                http.Error(w, "failed to build request: "+err.Error(), http.StatusInternalServerError)
                return
        }
        resp, err := client.Do(httpReq)
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

// ─── INTEGRATIONS ──────────────────────────────────────────────────────────
func getIntegrations(w http.ResponseWriter, r *http.Request) {
        rows, err := db.Query("SELECT id, name, itype, url, COALESCE(last_sync,''), COALESCE(cached_data,'{}') FROM integrations ORDER BY id ASC")
        if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        defer rows.Close()
        items := make([]Integration, 0)
        for rows.Next() {
                var it Integration
                if err := rows.Scan(&it.ID, &it.Name, &it.IType, &it.URL, &it.LastSync, &it.CachedData); err != nil {
                        http.Error(w, err.Error(), http.StatusInternalServerError)
                        return
                }
                items = append(items, it)
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(items)
}

func addIntegration(w http.ResponseWriter, r *http.Request) {
        var req struct {
                Name     string `json:"name"`
                IType    string `json:"itype"`
                URL      string `json:"url"`
                Username string `json:"username"`
                Password string `json:"password"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if req.Name == "" || req.URL == "" {
                http.Error(w, "name and url required", http.StatusBadRequest)
                return
        }
        if req.IType == "" {
                req.IType = "uptime_kuma"
        }
        result, err := db.Exec("INSERT INTO integrations (name, itype, url, username, password, last_sync, cached_data) VALUES (?, ?, ?, ?, ?, '', '{}')",
                req.Name, req.IType, req.URL, req.Username, req.Password)
        if err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        id, _ := result.LastInsertId()
        it := Integration{
                ID: int(id), Name: req.Name, IType: req.IType, URL: req.URL,
                LastSync: "", CachedData: "{}",
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(it)
}

func updateIntegration(w http.ResponseWriter, r *http.Request) {
        var req struct {
                ID       int    `json:"id"`
                Name     string `json:"name"`
                IType    string `json:"itype"`
                URL      string `json:"url"`
                Username string `json:"username"`
                Password string `json:"password"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if _, err := db.Exec("UPDATE integrations SET name=?, itype=?, url=?, username=?, password=? WHERE id=?",
                req.Name, req.IType, req.URL, req.Username, req.Password, req.ID); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        it := Integration{ID: req.ID, Name: req.Name, IType: req.IType, URL: req.URL}
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(it)
}

func deleteIntegration(w http.ResponseWriter, r *http.Request) {
        var it Integration
        if err := json.NewDecoder(r.Body).Decode(&it); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        if _, err := db.Exec("DELETE FROM integrations WHERE id=?", it.ID); err != nil {
                http.Error(w, err.Error(), http.StatusInternalServerError)
                return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func syncIntegration(w http.ResponseWriter, r *http.Request) {
        var req struct {
                ID int `json:"id"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }
        var itURL, itType string
        err := db.QueryRow("SELECT url, itype FROM integrations WHERE id=?", req.ID).Scan(&itURL, &itType)
        if err != nil {
                http.Error(w, "integration not found", http.StatusNotFound)
                return
        }
        client := &http.Client{Timeout: 15 * time.Second}
        resp, err := client.Get(itURL)
        if err != nil {
                http.Error(w, "failed to fetch: "+err.Error(), http.StatusInternalServerError)
                return
        }
        defer resp.Body.Close()
        body, err := io.ReadAll(resp.Body)
        if err != nil {
                http.Error(w, "failed to read body", http.StatusInternalServerError)
                return
        }
        var raw json.RawMessage
        if err := json.Unmarshal(body, &raw); err != nil {
                http.Error(w, "invalid JSON from remote", http.StatusInternalServerError)
                return
        }
        now := time.Now().Format(time.RFC3339)
        _, err = db.Exec("UPDATE integrations SET last_sync=?, cached_data=? WHERE id=?", now, string(body), req.ID)
        if err != nil {
                http.Error(w, "failed to cache", http.StatusInternalServerError)
                return
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{"data": raw, "last_sync": now})
}

// ─── ADGUARD ENDPOINT ──────────────────────────────────────────────────────

func fetchAdguardStats(w http.ResponseWriter, r *http.Request) {
        var req struct {
                ID int `json:"id"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }

        var instanceURL, username, password string
        err := db.QueryRow("SELECT url, COALESCE(username,''), COALESCE(password,'') FROM integrations WHERE id=?", req.ID).
                Scan(&instanceURL, &username, &password)
        if err != nil {
                http.Error(w, "integration not found", http.StatusNotFound)
                return
        }

        statsURL := strings.TrimRight(instanceURL, "/") + "/control/stats"
        request, err := http.NewRequest("GET", statsURL, nil)
        if err != nil {
                http.Error(w, "failed to build request: "+err.Error(), http.StatusInternalServerError)
                return
        }
        request.SetBasicAuth(username, password)

        client := &http.Client{Timeout: 15 * time.Second}
        resp, err := client.Do(request)
        if err != nil {
                http.Error(w, "failed to fetch AdGuard: "+err.Error(), http.StatusBadGateway)
                return
        }
        defer resp.Body.Close()

        if resp.StatusCode == http.StatusUnauthorized {
                http.Error(w, "invalid AdGuard credentials", http.StatusUnauthorized)
                return
        }

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                http.Error(w, "failed to read response", http.StatusInternalServerError)
                return
        }

        var raw AdguardStatsResponse
        if err := json.Unmarshal(body, &raw); err != nil {
                http.Error(w, "failed to parse AdGuard response: "+err.Error(), http.StatusInternalServerError)
                return
        }

        const hoursSpan = 24
        const numBars = 8
        const hoursPerBar = hoursSpan / numBars

        stats := AdguardStats{
                TotalQueries:   raw.TotalQueries,
                BlockedQueries: raw.BlockedQueries,
                ResponseTimeMs: int(raw.ResponseTime * 1000),
        }

        if raw.TotalQueries > 0 {
                stats.BlockedPercent = int(float64(raw.BlockedQueries) / float64(raw.TotalQueries) * 100)
        }

        type domainCount struct {
                domain string
                count  int
        }
        var dc []domainCount
        for _, m := range raw.TopBlockedDomains {
                for k, v := range m {
                        dc = append(dc, domainCount{k, v})
                }
        }
        sort.Slice(dc, func(i, j int) bool { return dc[i].count > dc[j].count })
        limit := 5
        if len(dc) < limit {
                limit = len(dc)
        }
        for i := 0; i < limit; i++ {
                pct := 0
                if raw.BlockedQueries > 0 {
                        pct = int(float64(dc[i].count) / float64(raw.BlockedQueries) * 100)
                }
                stats.TopDomains = append(stats.TopDomains, AdguardTopDomain{
                        Domain:  dc[i].domain,
                        Count:   dc[i].count,
                        Percent: pct,
                })
        }

        queriesSeries := raw.QueriesSeries
        blockedSeries := raw.BlockedSeries

        for len(queriesSeries) < hoursSpan {
                queriesSeries = append([]int{0}, queriesSeries...)
        }
        if len(queriesSeries) > hoursSpan {
                queriesSeries = queriesSeries[len(queriesSeries)-hoursSpan:]
        }
        for len(blockedSeries) < hoursSpan {
                blockedSeries = append([]int{0}, blockedSeries...)
        }
        if len(blockedSeries) > hoursSpan {
                blockedSeries = blockedSeries[len(blockedSeries)-hoursSpan:]
        }

        maxQ := 0
        bars := make([]AdguardSeriesBar, numBars)
        for i := 0; i < numBars; i++ {
                q, b := 0, 0
                for j := 0; j < hoursPerBar; j++ {
                        q += queriesSeries[i*hoursPerBar+j]
                        b += blockedSeries[i*hoursPerBar+j]
                }
                bars[i] = AdguardSeriesBar{Queries: q, Blocked: b}
                if q > 0 {
                        bars[i].PercentBlocked = int(float64(b) / float64(q) * 100)
                }
                if q > maxQ {
                        maxQ = q
                }
        }
        for i := range bars {
                if maxQ > 0 {
                        bars[i].PercentTotal = int(float64(bars[i].Queries) / float64(maxQ) * 100)
                }
        }
        stats.Series = bars

        now := time.Now()
        labels := make([]string, numBars)
        for h := hoursSpan; h > 0; h -= hoursPerBar {
                idx := numBars - (h / hoursPerBar)
                labels[idx] = now.Add(-time.Duration(h) * time.Hour).Format("15:00")
        }
        stats.TimeLabels = labels

        cacheJSON, _ := json.Marshal(stats)
        syncNow := time.Now().Format(time.RFC3339)
        db.Exec("UPDATE integrations SET last_sync=?, cached_data=? WHERE id=?", syncNow, string(cacheJSON), req.ID)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "stats":     stats,
                "last_sync": syncNow,
        })
}

// ─── SYNCTHING ENDPOINT ────────────────────────────────────────────────────

func fetchSyncthingStats(w http.ResponseWriter, r *http.Request) {
        var req struct {
                ID int `json:"id"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, err.Error(), http.StatusBadRequest)
                return
        }

        var instanceURL, apiKey, folderIDs string
        err := db.QueryRow("SELECT url, COALESCE(username,''), COALESCE(password,'') FROM integrations WHERE id=?", req.ID).
                Scan(&instanceURL, &apiKey, &folderIDs)
        if err != nil {
                http.Error(w, "integration not found", http.StatusNotFound)
                return
        }

        baseURL := strings.TrimRight(instanceURL, "/")
        client := &http.Client{Timeout: 15 * time.Second}

        makeReq := func(path string) (*http.Response, error) {
                hreq, err := http.NewRequest("GET", baseURL+path, nil)
                if err != nil {
                        return nil, err
                }
                hreq.Header.Set("X-API-Key", apiKey)
                return client.Do(hreq)
        }

        var version string
        if resp, err := makeReq("/rest/system/version"); err == nil {
                defer resp.Body.Close()
                var ver struct {
                        Version string `json:"version"`
                }
                if body, err := io.ReadAll(resp.Body); err == nil {
                        json.Unmarshal(body, &ver)
                        version = ver.Version
                }
        }

        var myID string
        if resp, err := makeReq("/rest/system/status"); err == nil {
                defer resp.Body.Close()
                var sysStatus struct {
                        MyID string `json:"myID"`
                }
                if body, err := io.ReadAll(resp.Body); err == nil {
                        json.Unmarshal(body, &sysStatus)
                        myID = sysStatus.MyID
                }
        }

        var config SyncthingConfig
        configResp, err := makeReq("/rest/system/config")
        if err != nil {
                http.Error(w, "failed to connect to Syncthing: "+err.Error(), http.StatusBadGateway)
                return
        }
        defer configResp.Body.Close()

        if configResp.StatusCode == http.StatusUnauthorized {
                http.Error(w, "invalid Syncthing API key", http.StatusUnauthorized)
                return
        }
        if configResp.StatusCode == http.StatusForbidden {
                http.Error(w, "Syncthing API key forbidden", http.StatusForbidden)
                return
        }

        configBody, err := io.ReadAll(configResp.Body)
        if err != nil {
                http.Error(w, "failed to read config", http.StatusInternalServerError)
                return
        }
        if err := json.Unmarshal(configBody, &config); err != nil {
                http.Error(w, "failed to parse config: "+err.Error(), http.StatusInternalServerError)
                return
        }

        targetFolders := config.Folders
        if folderIDs != "" {
                ids := strings.Split(folderIDs, ",")
                idMap := map[string]bool{}
                for _, id := range ids {
                        trimmed := strings.TrimSpace(id)
                        if trimmed != "" {
                                idMap[trimmed] = true
                        }
                }
                if len(idMap) > 0 {
                        var filtered []SyncthingFolder
                        for _, f := range config.Folders {
                                if idMap[f.ID] {
                                        filtered = append(filtered, f)
                                }
                        }
                        if len(filtered) > 0 {
                                targetFolders = filtered
                        }
                }
        }

        var folderStatuses []SyncthingFolderStatus
        for _, folder := range targetFolders {
                status := SyncthingFolderStatus{
                        FolderID: folder.ID,
                        Label:    folder.Label,
                }
                if status.Label == "" {
                        status.Label = folder.ID
                }

                compResp, err := makeReq("/rest/db/completion?folder=" + folder.ID)
                if err == nil && compResp.StatusCode == 200 {
                        defer compResp.Body.Close()
                        compBody, _ := io.ReadAll(compResp.Body)
                        var comp SyncthingCompletion
                        if json.Unmarshal(compBody, &comp) == nil {
                                status.Completion = comp
                                status.Reachable = true
                        }
                } else {
                        status.Reachable = false
                }
                folderStatuses = append(folderStatuses, status)
        }

        stats := SyncthingStats{
                Version: version,
                Folders: folderStatuses,
                MyID:    myID,
        }

        cacheJSON, _ := json.Marshal(stats)
        syncNow := time.Now().Format(time.RFC3339)
        db.Exec("UPDATE integrations SET last_sync=?, cached_data=? WHERE id=?", syncNow, string(cacheJSON), req.ID)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
                "stats":     stats,
                "last_sync": syncNow,
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

// getDiskAt lee el uso de disco en un path específico
func getDiskAt(path string) (usedGB, totalGB string, percent float64) {
        var stat syscall.Statfs_t
        if err := syscall.Statfs(path, &stat); err != nil {
                return "?", "?", 0
        }
        total := stat.Blocks * uint64(stat.Bsize)
        free := stat.Bfree * uint64(stat.Bsize)
        used := total - free
        if total == 0 {
                return "0", "0", 0
        }
        pct := math.Round(float64(used)/float64(total)*1000) / 10
        return fmt.Sprintf("%.0f", float64(used)/1024/1024/1024),
                fmt.Sprintf("%.0f", float64(total)/1024/1024/1024),
                pct
}

// parseDiskEnv lee la variable DISKS con formato "Nombre:ruta,Nombre2:ruta2"
// Ejemplo: "Sistema:/,NAS:/mnt/NAS,Backup:/mnt/backup"
func parseDiskEnv() []DiskInfo {
        disksEnv := os.Getenv("DISKS")
        if disksEnv == "" {
                // Comportamiento por defecto: solo disco raíz
                used, total, pct := getDiskAt("/")
                return []DiskInfo{{Name: "Sistema", Path: "/", UsedGB: used, TotalGB: total, Percent: pct}}
        }

        var disks []DiskInfo
        entries := strings.Split(disksEnv, ",")
        for _, entry := range entries {
                entry = strings.TrimSpace(entry)
                if entry == "" {
                        continue
                }
                // Separar por el primer ":" solamente (la ruta puede contener ":")
                idx := strings.Index(entry, ":")
                if idx < 1 {
                        continue
                }
                name := strings.TrimSpace(entry[:idx])
                path := strings.TrimSpace(entry[idx+1:])
                if name == "" || path == "" {
                        continue
                }
                used, total, pct := getDiskAt(path)
                disks = append(disks, DiskInfo{
                        Name:    name,
                        Path:    path,
                        UsedGB:  used,
                        TotalGB: total,
                        Percent: pct,
                })
        }

        if len(disks) == 0 {
                used, total, pct := getDiskAt("/")
                return []DiskInfo{{Name: "Sistema", Path: "/", UsedGB: used, TotalGB: total, Percent: pct}}
        }
        return disks
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
        disks := parseDiskEnv()

        uptimeStr := "?"
        data, err := os.ReadFile("/proc/uptime")
        if err == nil {
                var secs float64
                fmt.Sscanf(strings.TrimSpace(string(data)), "%f", &secs)
                uptimeStr = formatUptime(time.Duration(secs) * time.Second)
        }

        // Primer disco como fallback para campos legacy
        var legacyUsed, legacyTotal string
        var legacyPct float64
        if len(disks) > 0 {
                legacyUsed = disks[0].UsedGB
                legacyTotal = disks[0].TotalGB
                legacyPct = disks[0].Percent
        }

        info := SysInfo{
                CPUPercent:  cpuPct,
                RAMPercent:  ramPct,
                RAMUsedGB:   ramUsed,
                RAMTotalGB:  ramTotal,
                Disks:       disks,
                DiskPercent: legacyPct,
                DiskUsedGB:  legacyUsed,
                DiskTotalGB: legacyTotal,
                Uptime:      uptimeStr,
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

        http.HandleFunc("/api/integrations", cors(func(w http.ResponseWriter, r *http.Request) {
                switch r.Method {
                case "GET":
                        getIntegrations(w, r)
                case "POST":
                        addIntegration(w, r)
                case "PUT":
                        updateIntegration(w, r)
                case "DELETE":
                        deleteIntegration(w, r)
                default:
                        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                }
        }, "GET, POST, PUT, DELETE, OPTIONS"))

        http.HandleFunc("/api/integrations/sync", cors(syncIntegration, "POST, OPTIONS"))
        http.HandleFunc("/api/adguard/stats", cors(fetchAdguardStats, "POST, OPTIONS"))
        http.HandleFunc("/api/syncthing/stats", cors(fetchSyncthingStats, "POST, OPTIONS"))

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
