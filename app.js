const express = require("express");
const path = require("path");
const app = express();
const http = require("http");
const socketio = require("socket.io");

const server = http.createServer(app);
const io = socketio(server);

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Store user details (like name) mapped by their socket ID
const users = {};

// Handle socket.io connections
io.on("connection", function (socket) {
  console.log("A user connected:", socket.id);

  // Prompt user for their name or details
  socket.emit("request-user-details");

  // Receive and store user details
  socket.on("user-details", (details) => {
    if (details && details.name) { // Ensure the details are valid
      users[socket.id] = { name: details.name }; // Store user name
      console.log("User details received for", socket.id, ":", details);
    } else {
      console.error("Invalid user details received:", details);
    }
  });

  // Receive location from a user and broadcast it to others
  socket.on("send-location", function (data) {
    const user = users[socket.id]; // Get user details
    if (user) {
      console.log("Sending location for", socket.id, ":", data); // Debugging log
      io.emit("receive-location", {
        id: socket.id,
        name: user.name, // Send the user's name
        ...data,
      });
    } else {
      console.error("User not found for socket ID:", socket.id);
    }
  });

  // Handle user disconnection
  socket.on("disconnect", function () {
    console.log("A user disconnected:", socket.id);
    if (users[socket.id]) {
      delete users[socket.id]; // Remove the user details on disconnect
      io.emit("user-disconnected", socket.id);
    }
  });
});

// Render the "index" view on the root route
app.get("/", function (req, res) {
  res.render("index");
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
