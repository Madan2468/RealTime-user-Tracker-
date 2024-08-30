// Initialize the socket.io connection
const socket = io();

// Prompt the user for their name
let userName = prompt("Enter your name:");

// Send user details to the server
socket.emit("user-details", { name: userName });

// Initialize the Leaflet map
const map = L.map("map").setView([0, 0], 2); // Starting with a world view

// Set up the tile layer for the map using OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Object to store markers for different users
const markers = {};

// Check if the browser supports Geolocation API
if (navigator.geolocation) {
  // Watch the user's position and emit it via WebSocket
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log("Current Position:", latitude, longitude); // Debugging log
      socket.emit("send-location", { latitude, longitude });

      // Update or add marker for the user's location
      if (markers[socket.id]) {
        // If the marker already exists, just update its position
        markers[socket.id].setLatLng([latitude, longitude]);
      } else {
        // Add a marker for the user's initial location
        const marker = L.marker([latitude, longitude]).addTo(map);
        marker
          .bindPopup(
            `<b>${userName}</b><br>Latitude: ${latitude}<br>Longitude: ${longitude}`
          )
          .openPopup();
        markers[socket.id] = marker;

        // Zoom to the user's location on initial load
        map.setView([latitude, longitude], 15); // Zoom level 15 is a good city-level view
      }
    },
    (error) => {
      // Enhanced error handling
      switch (error.code) {
        case 1:
          console.error("Geolocation error: Permission denied. Please allow location access in your browser settings.");
          alert("Please enable location services and allow location access in your browser settings.");
          break;
        case 2:
          console.error("Geolocation error: Position unavailable. Check your network connection or try again later.");
          alert("Unable to determine your location. Check your network connection or try again later.");
          break;
        case 3:
          console.error("Geolocation error: Timeout. The request to get your location timed out.");
          alert("Getting your location timed out. Please try again.");
          break;
        default:
          console.error("Geolocation error: An unknown error occurred.");
          alert("An unknown error occurred while trying to get your location.");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000, // Increased timeout for more stable connections
      maximumAge: 0,
    }
  );
} else {
  console.error("Geolocation is not supported by this browser.");
  alert("Geolocation is not supported by your browser.");
}

// Listen for location updates from the server
socket.on("receive-location", (data) => {
  const { id, latitude, longitude, name } = data; // Receiving `name` from the server
  console.log("Received location:", data); // Debugging log

  // If a marker for this user already exists, update its position and popup content
  if (markers[id]) {
    markers[id].setLatLng([latitude, longitude]);
    markers[id]
      .getPopup()
      .setContent(
        `<b>${name}</b><br>Latitude: ${latitude}<br>Longitude: ${longitude}`
      );
  } else {
    // If no marker exists for this user, create one with a popup
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker
      .bindPopup(
        `<b>${name}</b><br>Latitude: ${latitude}<br>Longitude: ${longitude}`
      )
      .openPopup();
    markers[id] = marker;
  }
});

// Listen for user disconnection and remove their marker
socket.on("user-disconnected", (id) => {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
});
