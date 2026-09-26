# MERN Blog

A full-stack blogging platform built with **MongoDB, Express, React and Node.js**. Admins write and publish posts with a rich-text editor and cover images. Readers sign up (with email or Google), search and filter posts, and discuss them in threaded comments with likes. An admin dashboard shows users, posts, comments and monthly growth at a glance.

**Live demo:** https://mern-blog-final.onrender.com (Render free tier: the first load can take ~30s while the server wakes up)

> Originally built in 2024 during my 2nd year of college as my first end-to-end MERN project. The `v2` branch is where it gets revisited and improved.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Known Limitations / v2 Roadmap](#known-limitations--v2-roadmap)

---

## Features

**For readers**
- Sign up / sign in with email and password, or one click with **Google (Firebase OAuth)**
- Browse recent posts on the home page, open a post by its readable slug (`/post/my-first-post`)
- **Search** posts by keyword (matches title and content), filter by category, and sort newest/oldest
- **Comment** on posts, **like** comments, and edit or delete your own comments
- Profile page: change username, email, password and **profile picture** (uploaded to Firebase Storage with a live progress indicator)
- Delete your own account or sign out
- **Light / dark theme** toggle, remembered across visits

**For admins**
- Create and update posts with a **rich-text editor** (React Quill), a category and a cover image
- Dashboard overview: total users, posts and comments, plus how many were added **in the last month**
- Paginated tables to manage (and delete) all posts, users and comments

---

## Screenshots

| Home | Post page |
|---|---|
| <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.09.47%20AM.png" alt="Home page hero" /> | <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.11.41%20AM.png" alt="Blog post with read time" /> |
| **Comments with likes, edit and delete** | **Recent articles** |
| <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.13.41%20AM.png" alt="Comment section" /> | <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.13.52%20AM.png" alt="Recent article cards" /> |
| **Admin dashboard: profile** | **Regular user: profile** |
| <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.43%20AM.png" alt="Admin profile and dashboard sidebar" /> | <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.14.33%20AM.png" alt="User profile update" /> |
| **About** | **Projects: dark and light theme** |
| <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.04%20AM.png" alt="About page" /> | <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.17%20AM.png" alt="Projects page, dark theme" /> <img src="mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.28%20AM.png" alt="Projects page, light theme" /> |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| State | Redux Toolkit + redux-persist (user session & theme saved to localStorage) |
| UI | Tailwind CSS, Flowbite React, React Icons, React Circular Progressbar |
| Editor | React Quill |
| Backend | Node.js, Express 4 |
| Database | MongoDB with Mongoose 8 |
| Auth | JSON Web Tokens in an httpOnly cookie, bcryptjs password hashing, Firebase Google sign-in |
| File storage | Firebase Storage (post images and profile pictures) |
| Dates | Moment.js ("2 hours ago" on comments) |

---

## Architecture

```
┌──────────────────────────┐        /api/*  (JSON + cookie)       ┌──────────────────────────┐
│  React SPA (client/)     │ ────────────────────────────────────▶ │  Express API (api/)      │
│  Vite · Redux · Tailwind │ ◀──────────────────────────────────── │  routes → controllers    │
└──────────┬───────────────┘                                       └──────────┬───────────────┘
           │ image uploads                                                    │ Mongoose
           │ Google sign-in popup                                             ▼
           ▼                                                       ┌──────────────────────────┐
┌──────────────────────────┐                                       │  MongoDB                 │
│  Firebase                │                                       │  users · posts · comments│
│  Auth + Storage          │                                       └──────────────────────────┘
└──────────────────────────┘
```

How a request flows end to end:

1. The React app calls a relative URL such as `/api/post/getposts`.
   - **In development**, Vite's proxy ([client/vite.config.js](client/vite.config.js)) forwards `/api` to `http://localhost:3000`.
   - **In production**, Express serves the built React app from `client/dist`, so the frontend and API share one origin and no proxy is needed.
2. Express routes the request (`api/routes/*.route.js`). Protected routes first run `verifyToken` ([api/utils/verifyUser.js](api/utils/verifyUser.js)), which reads the `access_token` cookie, verifies the JWT and puts `{ id, isAdmin }` on `req.user`.
3. The controller (`api/controller/*.controller.js`) checks permissions, talks to MongoDB through the Mongoose models, and returns JSON.
4. Any error is passed to `next(err)` and handled by one central error middleware in [api/index.js](api/index.js), which always responds with `{ success: false, statusCode, message }`.
5. Images never pass through the backend. The browser uploads them straight to Firebase Storage and sends only the resulting download URL to the API.

---

## Project Structure

```
mern-blog/
├── api/                          # Express backend
│   ├── index.js                  # App entry: DB connection, middleware, routes, static hosting, error handler
│   ├── controller/               # Request handlers (business logic)
│   │   ├── auth.controller.js    #   signup, signin, google
│   │   ├── user.controller.js    #   update, delete, signout, list users, get user
│   │   ├── post.controller.js    #   create, getposts (search/filter/paginate), update, delete
│   │   └── comment.controller.js #   create, list, like/unlike, edit, delete
│   ├── models/                   # Mongoose schemas: User, Post, Comment
│   ├── routes/                   # Express routers, mounted under /api/*
│   └── utils/
│       ├── error.js              # errorHandler(statusCode, message) helper
│       └── verifyUser.js         # JWT cookie verification middleware
│
├── client/                       # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx               # Route definitions
│   │   ├── main.jsx              # Redux Provider, PersistGate, ThemeProvider
│   │   ├── firebase.js           # Firebase app initialisation
│   │   ├── pages/                # Home, About, Projects, Search, SignIn, SignUp,
│   │   │                         # Dashboard, CreatePost, UpdatePost, PostPage
│   │   ├── components/           # Header, Footer, PostCard, Comment(Section), OAuth,
│   │   │                         # Dash* dashboard panels, route guards, ThemeProvider
│   │   └── redux/                # store.js, user/userSlice.js, theme/themeSlice.js
│   ├── vite.config.js            # Dev proxy /api → localhost:3000
│   └── tailwind.config.js
│
├── mern blog screen shots/       # Screenshots used in this README
├── info.txt                      # My original build notes from 2024
└── package.json                  # Backend deps + root scripts (dev, start, build)
```

---

## Data Models

All three collections have automatic `createdAt` / `updatedAt` timestamps.

**User** ([api/models/user.model.js](api/models/user.model.js))

| Field | Type | Notes |
|---|---|---|
| `username` | String | required, unique |
| `email` | String | required, unique |
| `password` | String | required, stored as a bcrypt hash |
| `profilePicture` | String | URL, defaults to a blank avatar |
| `isAdmin` | Boolean | defaults to `false` |

**Post** ([api/models/post.model.js](api/models/post.model.js))

| Field | Type | Notes |
|---|---|---|
| `userId` | String | the admin who wrote it |
| `title` | String | required, unique |
| `content` | String | required, HTML from the rich-text editor |
| `image` | String | cover image URL, has a default |
| `category` | String | defaults to `uncategorized` (UI offers javascript, reactjs, nextjs, DSA, CyberSecurity, AIML) |
| `slug` | String | required, unique, generated from the title |

**Comment** ([api/models/comment.model.js](api/models/comment.model.js))

| Field | Type | Notes |
|---|---|---|
| `content` | String | required |
| `postId` | String | the post being commented on |
| `userId` | String | the comment author |
| `likes` | Array | ids of users who liked it |
| `numberOfLikes` | Number | defaults to `0` |

---

## Authentication & Authorization

**Sign-up** hashes the password with bcrypt (10 salt rounds) and saves the user.

**Sign-in** compares the password hash, then signs a JWT containing `{ id, isAdmin }` with `JWT_SECRET` and sends it as an **httpOnly cookie** named `access_token`. Because JavaScript can't read the cookie, the token is protected from XSS theft. The response body holds the user object (without the password), which the frontend stores in Redux.

**Google sign-in** opens a Firebase popup. The frontend sends the Google name, email and photo to `/api/auth/google`:
- if the email already exists, that user is signed in;
- otherwise a new user is created with a generated username and a random hashed password.

**Session persistence**: `redux-persist` keeps `currentUser` and the theme in localStorage, so a page refresh doesn't log you out. The cookie is what the server actually trusts.

**Roles**
- There is no sign-up flow for admins. To make someone an admin, set `isAdmin: true` on their user document directly in MongoDB.
- Frontend guards: `PrivateRoute` requires a signed-in user and `OnlyAdminPrivateRoute` requires an admin. Both redirect to `/sign-in` otherwise.
- The backend enforces the same rules in the controllers, so the UI guards are only for convenience, not security.

| Action | Who can do it |
|---|---|
| Read posts and comments | anyone |
| Comment, like a comment | signed-in users |
| Edit / delete a comment | its author or an admin |
| Update own profile | that user only |
| Delete an account | that user or an admin |
| Create / update / delete posts | admins |
| List all users / all comments | admins |

---

## API Reference

Base URL: `/api`. 🔒 means the `access_token` cookie is required.

### Auth — `/api/auth`

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/signup` | `{ username, email, password }` | Create an account |
| POST | `/signin` | `{ email, password }` | Sign in and set the auth cookie |
| POST | `/google` | `{ name, email, googlePhotoUrl }` | Sign in or sign up with Google |

### Users — `/api/user`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/test` | Health check: `{ message: "API is working!" }` |
| PUT | `/update/:userId` 🔒 | Update your own username, email, password, profilePicture. Username must be 7–20 characters, lowercase letters and digits only. Password must be at least 6 characters. |
| DELETE | `/delete/:userId` 🔒 | Delete your own account (or any account, as admin) |
| POST | `/signout` | Clear the auth cookie |
| GET | `/getusers` 🔒 admin | Paginated users. Query: `startIndex`, `limit` (default 9), `sort=asc\|desc`. Returns `{ users, totalUsers, lastMonthUsers }` |
| GET | `/:userId` | Public profile of one user (used to show comment authors) |

### Posts — `/api/post`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/create` 🔒 admin | Body `{ title, content, category?, image? }`. The slug is generated from the title. |
| GET | `/getposts` | Search and list posts. Returns `{ posts, totalPosts, lastMonthPosts }` |
| PUT | `/updatepost/:postId/:userId` 🔒 admin | Update title, content, category, image |
| DELETE | `/deletepost/:postId/:userId` 🔒 admin | Delete a post |

`GET /getposts` query parameters (all optional, and they can be combined):

| Param | Effect |
|---|---|
| `searchTerm` | case-insensitive match on title **or** content |
| `category` | exact category |
| `slug` | a single post by slug (used by the post page) |
| `postId` | a single post by id (used by the edit page) |
| `userId` | posts by one author |
| `order` | `asc` or `desc` (default) by last update |
| `startIndex`, `limit` | pagination (default limit 9) |

Example: `/api/post/getposts?searchTerm=react&category=reactjs&order=desc&limit=5`

### Comments — `/api/comment`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/create` 🔒 | Body `{ content, postId, userId }`. `userId` must match the signed-in user. |
| GET | `/getPostComments/:postId` | All comments on a post, newest first |
| PUT | `/likeComment/:commentId` 🔒 | Toggle a like from the current user |
| PUT | `/editComment/:commentId` 🔒 | Edit (author or admin) |
| DELETE | `/deleteComment/:commentId` 🔒 | Delete (author or admin) |
| GET | `/getcomments` 🔒 admin | Paginated comments. Returns `{ comments, totalComments, lastMonthComments }` |

### Error format

Every error response has the same shape:

```json
{ "success": false, "statusCode": 403, "message": "You are not allowed to create a post" }
```

---

## Frontend Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home: hero, call-to-action, recent posts | public |
| `/about` | About the blog | public |
| `/projects` | Project showcase cards | public |
| `/search` | Search with keyword, sort and category filters (state kept in the URL) | public |
| `/post/:postSlug` | Full post, comments, recent articles | public |
| `/sign-in`, `/sign-up` | Auth forms + Google button | public |
| `/dashboard?tab=...` | `profile` for everyone; `dash`, `posts`, `users`, `comments` for admins | signed in |
| `/create-post` | Rich-text post editor with image upload | admin |
| `/update-post/:postId` | Edit an existing post | admin |

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- A **MongoDB** database, either local or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A **Firebase** project with **Authentication → Google** enabled and **Storage** turned on

### 1. Clone and install

```bash
git clone https://github.com/Aakif9866/mern-blog.git
cd mern-blog

npm install                 # backend dependencies
npm install --prefix client # frontend dependencies
```

### 2. Configure environment variables

Create **two** `.env` files (see the [next section](#environment-variables) for details):

```bash
# ./.env  (backend, project root)
MONGO=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET=<any-long-random-string>
```

```bash
# ./client/.env  (frontend)
VITE_FIREBASE_API_KEY=<your-firebase-web-api-key>
```

If you use your own Firebase project, also replace the `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId` values in [client/src/firebase.js](client/src/firebase.js).

### 3. Run in development

Use two terminals:

```bash
# Terminal 1: API on http://localhost:3000 (auto-restarts with nodemon)
npm run dev
```

```bash
# Terminal 2: React app on http://localhost:5173 (proxies /api to :3000)
cd client
npm run dev
```

Open http://localhost:5173.

### 4. Make yourself an admin

Sign up in the app, then in MongoDB (Atlas UI, Compass or `mongosh`):

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { isAdmin: true } })
```

Sign out and back in so the new role is included in your JWT. The **Create a post** button and the admin dashboard tabs will then appear.

---

## Environment Variables

| Variable | Where | Used by | Purpose |
|---|---|---|---|
| `MONGO` | root `.env` | [api/index.js](api/index.js) | MongoDB connection string |
| `JWT_SECRET` | root `.env` | auth controller, `verifyToken` | Secret for signing and verifying JWTs |
| `VITE_FIREBASE_API_KEY` | `client/.env` | [client/src/firebase.js](client/src/firebase.js) | Firebase web API key (Vite only exposes variables that start with `VITE_`) |

`.env` is listed in `.gitignore`. Never commit real credentials.

---

## Scripts

Root `package.json` (backend):

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with nodemon (restarts when files change) |
| `npm start` | Start the API with node (production) |
| `npm run build` | Install backend and client deps, then build the React app into `client/dist` |

`client/package.json` (frontend):

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

---

## Deployment

The app deploys as a **single Node service**: Express serves both the API and the built React app.

```bash
npm run build   # builds client/dist
npm start       # serves /api/* and the SPA on port 3000
```

Any route that doesn't match `/api/*` returns `client/dist/index.html`, so React Router handles deep links like `/post/some-slug` on refresh.

The live version runs on **Render** with **MongoDB Atlas**. On Render (or a similar host such as Railway):
- **Build command:** `npm run build`
- **Start command:** `npm start`
- **Environment:** `MONGO`, `JWT_SECRET`, and `VITE_FIREBASE_API_KEY` (the Vite variable must be present **at build time**)
- Add the deployed domain to Firebase **Authentication → Authorized domains** so Google sign-in works.

---

## Known Limitations / v2 Roadmap

Things I'd do differently now, and the plan for this branch:

- [ ] Read the port from `process.env.PORT` instead of hard-coding `3000` (many hosts assign a port)
- [ ] Add `return` before `next(errorHandler(...))` in signup/signin validation, so a request with missing fields stops there instead of continuing
- [ ] Set JWT expiry and `secure` / `sameSite` cookie options for production
- [ ] Let admins edit and delete posts written by *other* admins (currently only the author can)
- [ ] Fix outdated code comments, e.g. the comment `create` route says "only admins can create" but any signed-in user can
- [ ] Sanitize rich-text HTML on the server before storing and rendering it
- [ ] Add server-side validation (e.g. zod/joi) and rate limiting on auth routes
- [ ] Delete a user's comments (and optionally posts) when the account is deleted
- [ ] Add tests (Jest + Supertest for the API, Vitest + React Testing Library for the client)
- [ ] Add a `.env.example` and a single `npm run dev` that starts both servers (e.g. `concurrently`)

---

## Author

[@Aakif9866](https://github.com/Aakif9866)
