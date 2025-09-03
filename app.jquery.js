// jQuery Implementation
$(document).ready(function() {
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
    
    // Initialize the application
    function init() {
        console.log('Initializing jQuery MapApp...');
        initMap();
        loadMockServices();
        bindEvents();
    }
    
    // Initialize Leaflet map
    function initMap() {
        if (map) {
            map.remove();
        }
        
        map = L.map('map', {
            center: [40.7128, -74.0060], // New York City (EDT timezone)
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
        $('#search-btn').off('click').on('click', function() {
            performSearch();
        });
        
        // Enter key in input
        $('#zipcode-input').off('keypress').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                performSearch();
            }
        });
        
        // Input change with debounce
        $('#zipcode-input').off('input').on('input', function() {
            const zipcode = $(this).val().trim();
            hideError();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Set new timeout for auto-search
            if (zipcode.length >= 3) {
                searchTimeout = setTimeout(() => {
                    performSearch();
                }, 1500); // Auto-search after 1.5 seconds of no typing
            }
        });
        
        // Find services button
        $('#find-services-btn').off('click').on('click', function() {
            if (currentLocation) {
                findNearestServices();
                $('#service-modal').show();
            }
        });
        
        // Modal close handlers
        $('.close-modal').off('click').on('click', function() {
            $(this).closest('.modal').hide();
        });

        $(window).off('click.modal').on('click.modal', function(e) {
            if ($(e.target).hasClass('modal')) {
                $('.modal').hide();
            }
        });

        // ESC key to close modal
        $(document).off('keydown.modal').on('keydown.modal', function(e) {
            if (e.keyCode === 27) {
                $('.modal').hide();
            }
        });
    }
    
    // Search functionality with improved error handling and rate limiting
    function performSearch() {
        const zipcode = $('#zipcode-input').val().trim();
        
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

        $.ajax({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'ServiceAreaLocator/1.0 (contact@example.com)'
            },
            timeout: 8000,
            success: function(data) {
                clearTimeout(searchTimeout);
                setLoadingState(false);
                
                if (data && data.length > 0) {
                    handleSearchSuccess(data[0], zipcode);
                } else {
                    handleSearchFailure(zipcode);
                }
            },
            error: function(xhr, status, error) {
                clearTimeout(searchTimeout);
                setLoadingState(false);
                
                if (status === 'timeout') {
                    showError('Search timed out. Please check your internet connection and try again.');
                } else if (xhr.status === 429) {
                    showError('Too many requests. Please wait a moment and try again.');
                } else {
                    showError('Unable to search location. Please try again later.');
                }
                console.error('Search error:', status, error);
            }
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
        $('#find-services-btn').show();
        
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
        
        $('#modal-location-name').text(locationName);
        $('#modal-location-address').text(locationAddress);
        
        // Find and display nearest services
        findNearestServices();
        
        $('#service-modal').show();
    }

    function showNoServiceModal(location, zipcode) {
        const locationInfo = location.display_name;
        $('#no-service-location').text(`Location: ${locationInfo}`);
        $('#no-service-modal').show();
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
        const $servicesList = $('#services-list');
        $servicesList.empty();
        
        services.forEach(service => {
            const $serviceItem = $(`
                <div class="service-item" data-lat="${service.lat}" data-lon="${service.lon}">
                    <div class="service-info">
                        <h5>${service.name}</h5>
                        <p>${service.category} • ${service.address}</p>
                    </div>
                    <div class="service-distance">${service.distance.toFixed(1)} mi</div>
                </div>
            `);
            
            $serviceItem.on('click', function() {
                const lat = $(this).data('lat');
                const lon = $(this).data('lon');
                map.setView([lat, lon], 15);
                $('.modal').hide();
            });
            
            $servicesList.append($serviceItem);
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
            $('#search-btn').prop('disabled', true);
            $('.btn-text').hide();
            $('.loading-spinner').show();
        } else {
            $('#search-btn').prop('disabled', false);
            $('.btn-text').show();
            $('.loading-spinner').hide();
        }
    }
    
    function showError(message) {
        $('#error-message').text(message).show();
    }
    
    function hideError() {
        $('#error-message').hide();
    }
    
    function hideMessages() {
        hideError();
    }
    
    // Initialize the app
    init();
});

