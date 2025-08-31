# Map Demo - Zipcode Search

Interactive map application for searching zipcodes and finding nearest services using Leaflet.js, OpenStreetMap, and Nominatim API.

## 🚀 Features

- **Interactive Map**: Zoom, pan, and touch controls powered by Leaflet.js
- **Zipcode Search**: Search any zipcode worldwide using Nominatim geocoding API
- **Location Markers**: Visual markers showing found locations on the map
- **Nearest Services**: Find and display mock services near the searched location
- **Dual Implementation**: Toggle between jQuery and Vanilla JavaScript versions
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Error Handling**: Comprehensive error handling for invalid inputs and API failures
- **Rate Limiting**: Built-in compliance with Nominatim's 1 req/sec rate limit

## 🛠 Technologies Used

- **[Leaflet.js](https://leafletjs.com/)** - Open-source interactive map library
- **[OpenStreetMap](https://www.openstreetmap.org/)** - Free map data tiles
- **[Nominatim API](https://nominatim.org/)** - Free geocoding service (no API key required)
- **jQuery** - JavaScript library for DOM manipulation
- **Vanilla JavaScript** - Pure JavaScript implementation
- **CSS3** - Responsive design with flexbox and grid

## 📁 Project Structure

```
map-demo/
├── index.html              # Main HTML file with UI components
├── styles.css              # Responsive CSS styles
├── app.jquery.js           # jQuery implementation
├── app.vanilla.js          # Vanilla JavaScript implementation
├── mock_services.json      # Sample services data
└── README.md              # This file
```

## 🎯 How to Use

### 1. Setup
```powershell
# Clone or download the project
# Navigate to the project directory
cd map-demo

# Start a local server (choose one)
npx http-server -p 8080
# OR
python -m http.server 8080
```

### 2. Open in Browser
Navigate to `http://localhost:8080` in your web browser.

### 3. Search for Zipcodes
- Enter a zipcode in the search box (e.g., "10001", "12345 Jakarta")
- Click "Search" or press Enter
- The map will center on the found location with a marker

### 4. Find Nearest Services
- After a successful zipcode search, click "Find Nearest Services"
- View the 5 nearest mock services with distances
- Click on any service item to center the map on that location

### 5. Switch Implementations
- Use the toggle buttons at the top to switch between jQuery and Vanilla JS versions
- Both versions provide identical functionality

## 🔧 API Usage

### Nominatim API
The app uses the Nominatim API for geocoding:
```
https://nominatim.openstreetmap.org/search?format=json&q={zipcode}&addressdetails=1&limit=5&email=demo@example.com
```

**Important Notes:**
- Rate limit: 1 request per second per IP
- Include an email parameter for identification (recommended)
- For production use, consider setting up a backend proxy
- Always include OpenStreetMap attribution

### Mock Services Data
Services are loaded from `mock_services.json` with the following structure:
```json
{
  "id": 1,
  "name": "Service Name",
  "category": "Category",
  "lat": -6.2088,
  "lon": 106.8456,
  "address": "Full Address",
  "phone": "+62-21-xxxx-xxxx"
}
```

## 📱 Mobile Support

- Touch-friendly interface with appropriate touch targets
- Responsive design that adapts to different screen sizes
- Leaflet's built-in touch controls for map interaction
- Optimized input fields to prevent zoom on iOS devices

## ⚠️ Limitations & Considerations

### Free Tier Limitations
- **Nominatim Rate Limits**: 1 request per second
- **Usage Policy**: Suitable for prototyping and low-traffic applications
- **No API Key Required**: But identification via email is recommended

### Production Considerations
- For high-traffic applications, implement a backend proxy
- Consider caching geocoding results
- Monitor usage and respect rate limits
- Implement proper error handling and user feedback

## 🔍 Error Handling

The application handles various error scenarios:
- Invalid or non-existent zipcodes
- Network connectivity issues
- Rate limit exceeded (429 errors)
- API timeouts
- Invalid coordinate responses

## 🎨 Customization

### Adding More Services
Edit `mock_services.json` to add your own services:
```json
{
  "id": 99,
  "name": "Your Service",
  "category": "Your Category",
  "lat": your_latitude,
  "lon": your_longitude,
  "address": "Your Address"
}
```

### Styling
Modify `styles.css` to customize:
- Color schemes
- Layout and spacing
- Marker styles
- Responsive breakpoints

### Functionality
Extend either `app.jquery.js` or `app.vanilla.js` to add:
- Different map tile providers
- Additional marker types
- More sophisticated search filters
- Integration with other APIs

## 🌍 Attribution

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Geocoding by [Nominatim](https://nominatim.org/)
- Map rendering by [Leaflet](https://leafletjs.com/)

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements:
- Bug fixes
- New features
- Better error handling
- Performance optimizations
- Documentation improvements

## 🔗 Useful Links

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [jQuery Documentation](https://api.jquery.com/)

---

**Happy Mapping! 🗺️**
