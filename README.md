# MERN Blog Platform



**A full-stack blogging platform built using MongoDB, Express, React, Node.js, with modern features like theme switching, JWT auth, Google OAuth, and admin controls. Fully responsive UI with CRUD support and deployed on Render.**

---


## Features : 





### Authentication

- JWT-based secure authentication

- Google OAuth login

- Role-based access (Admin / User)

###  Blog Features

- Create, read, update, delete posts

- Rich text editor for writing blogs

- Image upload (Cloud / Local depending on setup)

- Search & filtering by title, category, and tags

- View counts & timestamps


###  UI / UX

- React + TailwindCSS

- Dark / Light mode toggle

- Responsive design (desktop, tablet, mobile)

- Redux Toolkit for state management

### Admin Capabilities

- Manage all posts

- Delete users or blogs

- Dashboard insights (optional charts / stats if added)

### Backend

- Express REST API

- Mongoose models

- Secure routes with middleware

- Error handling utilities

- Authentication & user management

### Deployment

- "Hosted on Render (Frontend + Backend)" 

- Connected with MongoDB Atlas

### Tech Stack

#### Frontend

- React

- TailwindCSS

- Redux Toolkit

- React Router

#### Backend

- Node.js

- Express.js

- JWT

- Google OAuth 2.0

- Mongoose (MongoDB)


 Folder Structure

```
project/
│
├── api/                # Backend (Node + Express)
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── index.js
│   └── .env
│
├── client/             # Frontend (React)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md
```

#  Setup & Installation


**Clone the project -->> follow the steps**


    1. git clone https://github.com/Aakif9866/mern-blog
    2. cd project
    3. Install dependencies (npm i )\
    4. cd api
    5. npm install
    6. cd ../client
    7. npm install

3️⃣ Add environment variables

Create an .env inside api/:

MONGO_URI=your_mongo_connection
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id

4️⃣ Run the development servers

    Backend: 
    npm run dev
    Frontend:
    npm run dev



Deployment (Render)


# screenshots 


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.09.47%20AM.png?raw=true)

![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.04%20AM.png?raw=true)


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.17%20AM.png?raw=true)



![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.28%20AM.png?raw=true)


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.10.43%20AM.png?raw=true)



![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.11.41%20AM.png?raw=true)


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.13.41%20AM.png?raw=true)


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.13.52%20AM.png?raw=true)


![](https://github.com/Aakif9866/mern-blog/blob/main/mern%20blog%20screen%20shots/Screenshot%202025-11-27%20at%201.14.33%20AM.png?raw=true)
