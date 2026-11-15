# Assignment 8 - Study Programme Info Server

A small Node.js and Express 5 server with several routes, a browser page served by the same server, and request-logging middleware.

## Install and run

Requirements: Node.js (LTS) and npm.

```bash
git clone https://github.com/ErenGlds/Lab-8.git
cd Lab-8
npm install
npm start
```

For automatic restart on file changes, use `npm run dev` (it uses `node --watch`, no extra package). The server reads the port from `process.env.PORT` and falls back to `3000`, then prints the full address, for example `http://localhost:3000`.

## File organization

```
/
 ├─ public/
 │   ├─ index.html   browser page with one button per API route
 │   ├─ styles.css   page styles
 │   └─ app.js       fetch calls and response display
 ├─ server.js        Express app, middleware, routes, 404 fallback
 ├─ package.json     ES modules, scripts, dependencies
 ├─ package-lock.json
 ├─ .gitignore       node_modules/ and .env
 └─ README.md
```

## Middleware

Two middleware functions are registered before the static files and all routes:

- **Request logger:** prints a timestamp, the method and the URL, then calls `next()`.
- **Request counter:** increments a counter, then calls `next()`. The value is returned by `GET /api/stats`.

**Which requests are counted:** every request that reaches the server is counted, including static files (`/`, `styles.css`, `app.js`), redirects, 404 responses, and the `GET /api/stats` request itself (it is counted before the route reads the number). I chose this because the counter is registered before everything else, so it measures all traffic the server received, not only API calls.

**Why this order:** a middleware only sees a request if it runs before something sends a response. `express.static` and the routes end the response without calling `next()`, so if the logger or counter were placed after them, those requests would never be logged or counted. The 404 fallback is placed last for the opposite reason: it must only receive requests that no route matched.

## Testing evidence (`curl --include`)

### Successful JSON response: `GET /api/courses`

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 238
ETag: W/"ee-c6d4GRUBDFg3IZRx7EIQ9Lbki54"
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":1,"title":"Web Programming","credits":6},{"id":2,"title":"Cloud Computing","credits":5},{"id":3,"title":"Advanced Encryption and Network Security","credits":6},{"id":4,"title":"Discrete Optimization and Network Flows","credits":5}]
```

### 201 response: `POST /api/subscribe`

```
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 19
ETag: W/"13-oWAPIqDXuocNexKhPYW9ayyk98c"
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"subscribed":true}
```

### 403 response: `GET /api/admin`

```
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-TLNzmZqKxaTuFdX/dVWWPBu44/c"
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Forbidden"}
```

### Redirect: `GET /old-page`

```
HTTP/1.1 302 Found
X-Powered-By: Express
Location: /hello
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 28
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to /hello
```

### 404 on an API path: `GET /api/does-not-exist`

```
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

### 404 on a non-API path: `GET /does-not-exist`

```
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 14
ETag: W/"e-vDAjs2Bjp2gdskaBRytU+hHw1Ow"
Date: Sun, 15 Nov 2026 12:38:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Page not found
```

## Reasoning questions

**1. Route order.** I moved the 404 fallback to the top of `server.js`, right after creating the app. Every request, including `/hello` and `/api/courses`, returned 404, and the logger printed nothing. The fallback matches every request and sends a response without calling `next()`, so Express never reached the middleware or the real routes below it.

**2. Middleware.** I removed `next()` from the logger. The browser kept loading the page and never received a response, while the server printed one log line per request and nothing more. Without `next()`, the request stops at the logger: the counter, the static files and the routes never run, and nothing ends the response.

**3. Status codes.** `POST /api/subscribe` creates a new subscription, and `201 Created` says exactly that, while `200 OK` only says the request succeeded. A missing page is a `404` because the status code is what clients, browsers and `fetch` (`response.ok`) use to detect failure. A `200` with an error message would look like a success to them and to caches and search engines.

**4. Configuration.** Hosting platforms and other environments choose the port and pass it through the `PORT` environment variable, so a hard-coded `3000` could fail there. It also lets me run the server on another port locally when `3000` is already taken. The `|| 3000` fallback keeps it working with no configuration.

**5. Dependencies.** `node_modules` is large, can be recreated from `package.json` and `package-lock.json`, and may contain platform-specific files, so it is not committed. A teammate clones the repository, runs `npm install` inside the folder, then starts the server with `npm start` (or `npm run dev`).

**6. Same origin.** If the page were opened directly from disk (`file:///...`), the relative URLs would point to local files instead of the server, so the calls would fail. Using the full address `http://localhost:3000/api/...` from a file page would be a cross-origin request, which the browser blocks by default. This restriction is called the same-origin policy, and a server can relax it with CORS headers.

## Self-study notes

- **Node version and uptime:** the Node documentation for the `process` object describes `process.version`, which returns the Node version string, and `process.uptime()`, which returns the running time in seconds as a float. I used `process.version` and `Math.floor(process.uptime())` in `/api/status`.
- **Content type for `robots.txt`:** Express `res.type("text/plain")` sets the `Content-Type` header, and I chained `.send()` to write the body. The curl output confirms the content type.
- **Pretty JSON in the page:** `JSON.stringify(value, null, 2)` formats JSON with a two-space indentation. In `app.js` I parse the response text and format it, and I fall back to the raw text when it is not JSON (for example the plain-text 404).

## Challenges

- Node reported `Identifier 'express' has already been declared` because I pasted a new import block without removing the old `import express` line.
- `.gitignore` was not created correctly at first, so `node_modules` appeared in the files to commit. I recreated it with the correct name and checked `git status`.
- In PowerShell, `curl` is not the real curl, so I used `curl.exe` for the `--include` tests.
- I had to remember that the 404 fallback must be registered last and written without the Express 4 `*` wildcard.
