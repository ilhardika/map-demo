// Vanilla JavaScript Implementation
window.MapAppVanilla = (function() {
    'use strict';
    
    let map;
    let currentMarker;
    let serviceMarkers = [];
    let searchTimeout;
    let lastSearchTime = 0;
    let currentLocation = null;
    let mockServices = [];
    
    // Rate limiting - 1 request per second
    const RATE_LIMIT_MS = 1000;
    
    // DOM elements cache
    let elements = {};
    
    // Initialize the application
    function init() {
        console.log('Initializing Vanilla JS MapApp...');
        cacheElements();
        initMap();
        loadMockServices();
        bindEvents();
    }
    
    // Cache DOM elements
    function cacheElements() {
        elements = {
            searchBtn: document.getElementById('searchBtn'),
            zipcodeInput: document.getElementById('zipcodeInput'),
            findServicesBtn: document.getElementById('findServicesBtn'),
            servicesContainer: document.getElementById('servicesContainer'),
            servicesList: document.getElementById('servicesList'),
            errorMessage: document.getElementById('errorMessage'),
            statusMessage: document.getElementById('statusMessage'),
            searchText: document.querySelector('.search-text'),
            loadingSpinner: document.querySelector('.loading-spinner')
        };
    }
    
    // Initialize Leaflet map
    function initMap() {
        if (map) {
            map.remove();
        }
        
        map = L.map('map', {
            center: [-6.2088, 106.8456], // Jakarta center
            zoom: 10,
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            tap: true,
            maxZoom: 18,
            minZoom: 3
        });
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        
        // Handle map click to clear messages
        map.on('click', function() {
            hideMessages();
        });
    }
    
    // Load mock services data
    function loadMockServices() {
        fetch('mock_services.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                mockServices = data;
                console.log('Mock services loaded:', mockServices.length, 'services');
            })
            .catch(error => {
                console.warn('Could not load mock_services.json, using fallback data:', error);
                mockServices = getFallbackServices();
            });
    }
    
    // Fallback services data
    function getFallbackServices() {
        return [
            {
                id: 1,
                name: "Central Hospital",
                category: "Healthcare",
                lat: -6.2088,
                lon: 106.8456,
                address: "Jl. MH Thamrin No. 3, Jakarta Pusat"
            },
            {
                id: 2,
                name: "Bank Mandiri",
                category: "Banking", 
                lat: -6.2114,
                lon: 106.8446,
                address: "Jl. Jendral Sudirman Kav. 54-55, Jakarta"
            },
            {
                id: 3,
                name: "Grand Indonesia Mall",
                category: "Shopping",
                lat: -6.1953,
                lon: 106.8230,
                address: "Jl. MH Thamrin No. 1, Jakarta Pusat"
            }
        ];
    }
    
    // Bind event handlers
    function bindEvents() {
        // Search button click
        elements.searchBtn.removeEventListener('click', handleSearchClick);
        elements.searchBtn.addEventListener('click', handleSearchClick);
        
        // Enter key in input
        elements.zipcodeInput.removeEventListener('keypress', handleInputKeypress);
        elements.zipcodeInput.addEventListener('keypress', handleInputKeypress);
        
        // Input change with debounce
        elements.zipcodeInput.removeEventListener('input', handleInputChange);
        elements.zipcodeInput.addEventListener('input', handleInputChange);
        
        // Find services button
        elements.findServicesBtn.removeEventListener('click', handleFindServicesClick);
        elements.findServicesBtn.addEventListener('click', handleFindServicesClick);
    }
    
    // Event handlers
    function handleSearchClick() {
        const zipcode = elements.zipcodeInput.value.trim();
        if (zipcode) {
            searchZipcode(zipcode);
        } else {
            showError('Please enter a zipcode');
        }
    }
    
    function handleInputKeypress(e) {
        if (e.which === 13 || e.keyCode === 13) { // Enter key
            handleSearchClick();
        }
    }
    
    function handleInputChange() {
        const zipcode = elements.zipcodeInput.value.trim();
        hideMessages();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for auto-search
        if (zipcode.length >= 3) {
            searchTimeout = setTimeout(() => {
                searchZipcode(zipcode);
            }, 1500); // Auto-search after 1.5 seconds of no typing
        }
    }
    
    function handleFindServicesClick() {
        if (currentLocation) {
            findNearestServices();
        }
    }
    
    // Search zipcode using Nominatim API
    function searchZipcode(zipcode) {
        const now = Date.now();
        
        // Rate limiting check
        if (now - lastSearchTime < RATE_LIMIT_MS) {
            const waitTime = RATE_LIMIT_MS - (now - lastSearchTime);
            showStatus(`Please wait ${Math.ceil(waitTime/1000)} seconds before searching again`);
            return;
        }
        
        showLoading(true);
        hideMessages();
        
        const query = encodeURIComponent(zipcode);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5&email=demo@example.com`;
        
        lastSearchTime = now;
        
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        fetch(url, {
            method: 'GET',
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showLoading(false);
            
            if (data && data.length > 0) {
                const result = data[0]; // Take first result
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                
                if (isValidCoordinate(lat, lon)) {
                    showLocationOnMap(lat, lon, result.display_name);
                    currentLocation = { lat, lon, name: result.display_name };
                    showStatus(`Found: ${result.display_name}`);
                    elements.servicesContainer.style.display = 'block';
                } else {
                    showError('Invalid coordinates received');
                }
            } else {
                showError('Zipcode not found. Try adding city or country name.');
                elements.servicesContainer.style.display = 'none';
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            showLoading(false);
            
            if (error.name === 'AbortError') {
                showError('Search timeout. Please try again.');
            } else if (error.message.includes('429')) {
                showError('Rate limit exceeded. Please wait before searching again.');
            } else {
                showError('Search failed. Please check your connection and try again.');
            }
            
            console.error('Search error:', error);
            elements.servicesContainer.style.display = 'none';
        });
    }
    
    // Validate coordinates
    function isValidCoordinate(lat, lon) {
        return !isNaN(lat) && !isNaN(lon) && 
               lat >= -90 && lat <= 90 && 
               lon >= -180 && lon <= 180;
    }
    
    // Show location on map
    function showLocationOnMap(lat, lon, name) {
        // Remove existing marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        // Create custom marker
        const customIcon = L.divIcon({
            className: 'custom-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        // Add new marker
        currentMarker = L.marker([lat, lon], { icon: customIcon })
            .addTo(map)
            .bindPopup(`<strong>📍 ${name}</strong><br><small>${lat.toFixed(4)}, ${lon.toFixed(4)}</small>`)
            .openPopup();
        
        // Center and zoom map to location
        map.setView([lat, lon], 13);
    }
    
    // Find nearest services
    function findNearestServices() {
        if (!currentLocation || mockServices.length === 0) {
            showError('No location set or services data unavailable');
            return;
        }
        
        // Calculate distances and sort
        const servicesWithDistance = mockServices.map(service => {
            const distance = calculateDistance(
                currentLocation.lat, 
                currentLocation.lon, 
                service.lat, 
                service.lon
            );
            return { ...service, distance };
        }).sort((a, b) => a.distance - b.distance);
        
        // Show top 5 nearest services
        const nearestServices = servicesWithDistance.slice(0, 5);
        displayServices(nearestServices);
        showServicesOnMap(nearestServices);
    }
    
    // Calculate distance using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    function toRad(deg) {
        return deg * (Math.PI/180);
    }
    
    // Display services list
    function displayServices(services) {
        elements.servicesList.innerHTML = '';
        
        if (services.length === 0) {
            elements.servicesList.innerHTML = '<p>No services found nearby.</p>';
            return;
        }
        
        services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item';
            serviceItem.innerHTML = `
                <div class="service-name">${service.name}</div>
                <div class="service-category">📂 ${service.category}</div>
                <div class="service-distance">📍 ${service.distance.toFixed(2)} km away</div>
                ${service.address ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">${service.address}</div>` : ''}
            `;
            
            // Click to center on service
            serviceItem.addEventListener('click', function() {
                map.setView([service.lat, service.lon], 15);
                
                // Find and open popup for this service marker
                serviceMarkers.forEach(marker => {
                    if (marker.options.serviceId === service.id) {
                        marker.openPopup();
                    }
                });
            });
            
            elements.servicesList.appendChild(serviceItem);
        });
    }
    
    // Show services on map
    function showServicesOnMap(services) {
        // Clear existing service markers
        serviceMarkers.forEach(marker => map.removeLayer(marker));
        serviceMarkers = [];
        
        // Add service markers
        services.forEach(service => {
            const serviceIcon = L.divIcon({
                className: 'service-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            const marker = L.marker([service.lat, service.lon], { 
                icon: serviceIcon,
                serviceId: service.id
            })
            .addTo(map)
            .bindPopup(`
                <strong>🏢 ${service.name}</strong><br>
                <em>${service.category}</em><br>
                <small>📍 ${service.distance.toFixed(2)} km away</small>
                ${service.address ? `<br><small>${service.address}</small>` : ''}
            `);
            
            serviceMarkers.push(marker);
        });
        
        // Fit map to show all markers
        if (services.length > 0) {
            const group = new L.featureGroup([currentMarker, ...serviceMarkers]);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    // UI Helper Functions
    function showLoading(show) {
        if (show) {
            elements.searchBtn.disabled = true;
            elements.searchText.style.display = 'none';
            elements.loadingSpinner.style.display = 'inline';
        } else {
            elements.searchBtn.disabled = false;
            elements.searchText.style.display = 'inline';
            elements.loadingSpinner.style.display = 'none';
        }
    }
    
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        elements.statusMessage.style.display = 'none';
    }
    
    function showStatus(message) {
        elements.statusMessage.textContent = message;
        elements.statusMessage.style.display = 'block';
        elements.errorMessage.style.display = 'none';
    }
    
    function hideMessages() {
        elements.errorMessage.style.display = 'none';
        elements.statusMessage.style.display = 'none';
    }
    
    // Destroy function for cleanup
    function destroy() {
        if (map) {
            map.remove();
            map = null;
        }
        currentMarker = null;
        serviceMarkers = [];
        currentLocation = null;
        
        // Clear timeouts
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Unbind events
        if (elements.searchBtn) {
            elements.searchBtn.removeEventListener('click', handleSearchClick);
        }
        if (elements.zipcodeInput) {
            elements.zipcodeInput.removeEventListener('keypress', handleInputKeypress);
            elements.zipcodeInput.removeEventListener('input', handleInputChange);
        }
        if (elements.findServicesBtn) {
            elements.findServicesBtn.removeEventListener('click', handleFindServicesClick);
        }
        
        console.log('Vanilla JS MapApp destroyed');
    }
    
    // Public API
    return {
        init: init,
        destroy: destroy,
        searchZipcode: searchZipcode,
        findNearestServices: findNearestServices
    };
    
})();
