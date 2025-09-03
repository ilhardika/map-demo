// Vanilla JavaScript Implementation
document.addEventListener('DOMContentLoaded', function() {
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
            searchBtn: document.getElementById('search-btn'),
            zipcodeInput: document.getElementById('zipcode-input'),
            findServicesBtn: document.getElementById('find-services-btn'),
            errorMessage: document.getElementById('error-message'),
            btnText: document.querySelector('.btn-text'),
            loadingSpinner: document.querySelector('.loading-spinner'),
            serviceModal: document.getElementById('service-modal'),
            noServiceModal: document.getElementById('no-service-modal'),
            servicesList: document.getElementById('services-list'),
            modalLocationName: document.getElementById('modal-location-name'),
            modalLocationAddress: document.getElementById('modal-location-address'),
            noServiceLocation: document.getElementById('no-service-location'),
            closeBtns: document.querySelectorAll('.close-modal')
        };
    }
    
    // Initialize Leaflet map
    function initMap() {
        if (map) {
            map.remove();
        }
        
        map = L.map('map', {
            center: [40.7128, -74.0060], // New York City
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
            hideError();
        });
    }
    
    // Load mock services data - Use New York services
    function loadMockServices() {
        mockServices = [
            { id: 1, name: "Manhattan HVAC Center", lat: 40.7589, lon: -73.9851, category: "HVAC Service", address: "123 Broadway, NY 10001" },
            { id: 2, name: "Brooklyn Air Solutions", lat: 40.6782, lon: -73.9442, category: "Air Conditioning", address: "456 Atlantic Ave, Brooklyn 11217" },
            { id: 3, name: "Queens Heating & Cooling", lat: 40.7282, lon: -73.7949, category: "Heating Service", address: "789 Northern Blvd, Queens 11372" },
            { id: 4, name: "Bronx Climate Control", lat: 40.8448, lon: -73.8648, category: "HVAC Repair", address: "321 Grand Concourse, Bronx 10451" },
            { id: 5, name: "Staten Island Air Care", lat: 40.5795, lon: -74.1502, category: "Air Quality", address: "654 Richmond Ave, Staten Island 10314" },
            { id: 6, name: "Midtown Mechanical", lat: 40.7505, lon: -73.9934, category: "Commercial HVAC", address: "Times Square, NY 10036" },
            { id: 7, name: "Upper East Side Climate", lat: 40.7736, lon: -73.9566, category: "Residential Service", address: "1234 Lexington Ave, NY 10028" },
            { id: 8, name: "Chelsea Heating Pros", lat: 40.7465, lon: -74.0014, category: "Boiler Service", address: "567 W 23rd St, NY 10011" },
            { id: 9, name: "Financial District AC", lat: 40.7074, lon: -74.0113, category: "Emergency Repair", address: "89 Wall Street, NY 10005" },
            { id: 10, name: "Harlem Heat Solutions", lat: 40.8176, lon: -73.9482, category: "Installation", address: "2468 Malcolm X Blvd, NY 10027" },
            { id: 11, name: "Long Island City HVAC", lat: 40.7505, lon: -73.9425, category: "Maintenance", address: "11-11 44th Ave, LIC 11101" },
            { id: 12, name: "Williamsburg Air Tech", lat: 40.7081, lon: -73.9571, category: "Ductwork", address: "200 Grand St, Brooklyn 11249" },
            { id: 13, name: "Park Slope Climate Care", lat: 40.6723, lon: -73.9774, category: "Energy Efficiency", address: "78 7th Ave, Brooklyn 11217" },
            { id: 14, name: "Astoria Heating Hub", lat: 40.7698, lon: -73.9442, category: "Thermostat Service", address: "31-31 31st St, Astoria 11106" },
            { id: 15, name: "Battery Park Air Systems", lat: 40.7033, lon: -74.0170, category: "Indoor Air Quality", address: "1 Battery Park Plaza, NY 10004" }
        ];
        console.log('Mock services loaded:', mockServices.length, 'services');
    }
    
    // Bind event handlers
    function bindEvents() {
        // Search button click
        elements.searchBtn.addEventListener('click', performSearch);
        
        // Enter key in input
        elements.zipcodeInput.addEventListener('keypress', function(e) {
            if (e.which === 13 || e.keyCode === 13) {
                performSearch();
            }
        });
        
        // Input change with debounce
        elements.zipcodeInput.addEventListener('input', function() {
            const zipcode = this.value.trim();
            hideError();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Set new timeout for auto-search
            if (zipcode.length >= 3) {
                searchTimeout = setTimeout(() => {
                    performSearch();
                }, 1500);
            }
        });
        
        // Find services button
        if (elements.findServicesBtn) {
            elements.findServicesBtn.addEventListener('click', function() {
                if (currentLocation) {
                    findNearestServices();
                    showModal(elements.serviceModal);
                }
            });
        }
        
        // Modal close handlers
        elements.closeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                hideModal(modal);
            });
        });

        // Click outside modal to close
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                hideModal(e.target);
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 27) {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => hideModal(modal));
            }
        });
    }
    
    // Search functionality with improved error handling and rate limiting
    function performSearch() {
        const zipcode = elements.zipcodeInput.value.trim();
        
        if (!zipcode) {
            showError('Please enter a ZIP code');
            return;
        }

        if (!/^\d{5}(-\d{4})?$/.test(zipcode)) {
            showError('Please enter a valid ZIP code (e.g., 10001 or 10001-1234)');
            return;
        }

        // Rate limiting
        const now = Date.now();
        if (now - lastSearchTime < RATE_LIMIT_MS) {
            const remaining = RATE_LIMIT_MS - (now - lastSearchTime);
            showError(`Please wait ${Math.ceil(remaining/1000)} second(s) before searching again`);
            return;
        }

        lastSearchTime = now;
        hideError();
        setLoadingState(true);

        // Clear any existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set timeout for search (10 seconds)
        searchTimeout = setTimeout(() => {
            setLoadingState(false);
            showError('Search timed out. Please try again.');
        }, 10000);

        // Nominatim API search
        const query = `${zipcode} United States`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=5&addressdetails=1`;

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'ServiceAreaLocator/1.0 (contact@example.com)'
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            clearTimeout(searchTimeout);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            setLoadingState(false);
            
            if (data && data.length > 0) {
                handleSearchSuccess(data[0], zipcode);
            } else {
                handleSearchFailure(zipcode);
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            clearTimeout(searchTimeout);
            setLoadingState(false);
            
            if (error.name === 'AbortError') {
                showError('Search timed out. Please check your internet connection and try again.');
            } else if (error.message.includes('429')) {
                showError('Too many requests. Please wait a moment and try again.');
            } else {
                showError('Unable to search location. Please try again later.');
            }
            console.error('Search error:', error);
        });
    }

    function handleSearchSuccess(location, zipcode) {
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        // Remove existing marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        // Add new marker
        currentMarker = L.marker([lat, lon]).addTo(map);
        
        // Center map on location
        map.setView([lat, lon], 13);

        // Show find services button
        if (elements.findServicesBtn) {
            elements.findServicesBtn.style.display = 'inline-block';
        }
        
        // Store current location
        currentLocation = { lat, lon, name: location.display_name };

        // Check if we service this area (for demo, we'll say yes for NY area)
        const isServiceArea = isInServiceArea(lat, lon);
        
        if (isServiceArea) {
            showServiceModal(location, zipcode);
        } else {
            showNoServiceModal(location, zipcode);
        }
    }

    function handleSearchFailure(zipcode) {
        showError(`ZIP code "${zipcode}" not found. Please check the ZIP code and try again.`);
    }

    function isInServiceArea(lat, lon) {
        // For demo: consider service area as within 50 miles of NYC
        const nycLat = 40.7128;
        const nycLon = -74.0060;
        const distance = calculateDistance(lat, lon, nycLat, nycLon);
        return distance <= 50; // 50 miles radius
    }

    function showServiceModal(location, zipcode) {
        const locationName = location.display_name.split(',')[0];
        const locationAddress = location.display_name;
        
        if (elements.modalLocationName) {
            elements.modalLocationName.textContent = locationName;
        }
        if (elements.modalLocationAddress) {
            elements.modalLocationAddress.textContent = locationAddress;
        }
        
        // Find and display nearest services
        findNearestServices();
        
        showModal(elements.serviceModal);
    }

    function showNoServiceModal(location, zipcode) {
        const locationInfo = location.display_name;
        if (elements.noServiceLocation) {
            elements.noServiceLocation.textContent = `Location: ${locationInfo}`;
        }
        showModal(elements.noServiceModal);
    }

    function showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
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
        displayServicesInModal(nearestServices);
        showServicesOnMap(nearestServices);
    }

    function displayServicesInModal(services) {
        if (!elements.servicesList) return;
        
        elements.servicesList.innerHTML = '';
        
        services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item';
            serviceItem.dataset.lat = service.lat;
            serviceItem.dataset.lon = service.lon;
            
            serviceItem.innerHTML = `
                <div class="service-info">
                    <h5>${service.name}</h5>
                    <p>${service.category} • ${service.address}</p>
                </div>
                <div class="service-distance">${service.distance.toFixed(1)} mi</div>
            `;
            
            serviceItem.addEventListener('click', function() {
                const lat = parseFloat(this.dataset.lat);
                const lon = parseFloat(this.dataset.lon);
                map.setView([lat, lon], 15);
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => hideModal(modal));
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
            const marker = L.marker([service.lat, service.lon], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            
            marker.bindPopup(`
                <strong>${service.name}</strong><br>
                ${service.category}<br>
                ${service.address}<br>
                <em>${service.distance.toFixed(1)} miles away</em>
            `);
            
            serviceMarkers.push(marker);
        });
    }
    
    // Calculate distance using Haversine formula
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // UI Helper Functions
    function setLoadingState(loading) {
        if (loading) {
            elements.searchBtn.disabled = true;
            if (elements.btnText) elements.btnText.style.display = 'none';
            if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'inline';
        } else {
            elements.searchBtn.disabled = false;
            if (elements.btnText) elements.btnText.style.display = 'inline';
            if (elements.loadingSpinner) elements.loadingSpinner.style.display = 'none';
        }
    }
    
    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
        }
    }
    
    function hideError() {
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'none';
        }
    }
    
    // Initialize the app
    init();
});

